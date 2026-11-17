"""Bounded episode-summary evidence; no generated facts or playback URLs."""
import hashlib
import json
import math
import re
import unicodedata
from collections import Counter
from urllib.parse import urlsplit

HEX = re.compile(r'^[a-f0-9]{64}$')
IDENTITY = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$')
MODEL = 'amazon.titan-embed-text-v2:0'
DIMENSIONS = 512
RESERVATION = 10000  # Conservative one-cent allowance per attempted embedding, not a price quote.


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def digest(value):
    return hashlib.sha256(value).hexdigest()


def validate_corpus(raw):
    if not isinstance(raw, dict) or raw.get('version') != 1 or not HEX.fullmatch(str(raw.get('catalogRevision', ''))):
        raise ValueError('Invalid evidence corpus')
    docs = raw.get('documents')
    if not isinstance(docs, list) or not 1 <= len(docs) <= 150:
        raise ValueError('Pilot corpus must contain 1–150 documents')
    seen = set()
    for doc in docs:
        if not isinstance(doc, dict) or not HEX.fullmatch(str(doc.get('evidenceId', ''))) or doc['evidenceId'] in seen:
            raise ValueError('Invalid or duplicate evidence identity')
        seen.add(doc['evidenceId'])
        if doc.get('catalogRevision') != raw['catalogRevision']:
            raise ValueError('Mixed catalog revisions')
        for key in ('showId', 'episodeId', 'sourceId'):
            if not isinstance(doc.get(key), str) or not IDENTITY.fullmatch(doc[key]):
                raise ValueError('Invalid catalog identity')
        if any(type(doc.get(k)) is not int or doc[k] < 1 for k in ('season', 'number')):
            raise ValueError('Unresolved collection')
        for key, maximum in [('showTitle', 500), ('episodeTitle', 1000), ('summary', 3000), ('text', 5000)]:
            if not isinstance(doc.get(key), str) or not 1 <= len(doc[key]) <= maximum:
                raise ValueError('Invalid evidence text')
        if doc['text'] != f"{doc['showTitle']} — {doc['episodeTitle']}\n{doc['summary']}":
            raise ValueError('Inconsistent evidence text')
        url = urlsplit(doc.get('sourceUrl', ''))
        match = doc.get('match', {})
        if (doc.get('provider') != 'TVmaze' or doc.get('license') != 'CC BY-SA'
                or url.scheme != 'https' or url.netloc != 'www.tvmaze.com'
                or not re.fullmatch(r'/episodes/[1-9][0-9]*/[^/]+', url.path)
                or type(match.get('providerEpisodeId')) is not int
                or not url.path.startswith(f"/episodes/{match['providerEpisodeId']}/")
                or match.get('providerSeason') != doc['season'] or match.get('providerNumber') != doc['number']):
            raise ValueError('Unverified provider mapping')
        record = {k: v for k, v in doc.items() if k not in ('evidenceId', 'fetchedAt')}
        if digest(canonical_bytes(record)) != doc['evidenceId']:
            raise ValueError('Evidence content hash mismatch')
    return raw


def validate_query(event):
    if not isinstance(event, dict) or set(event) - {'query', 'limit', 'strategy'}:
        raise ValueError('Unsupported request')
    if event.get('strategy', 'hybrid') not in ['hybrid', 'jev']:
        raise ValueError('Unsupported strategy')
    query, limit = event.get('query'), event.get('limit', 5)
    if not isinstance(query, str) or not 2 <= len(query.strip()) <= 300 or len(query.encode()) > 1200:
        raise ValueError('Use a query of 2–300 characters')
    if any(ord(c) < 32 for c in query) or type(limit) is not int or not 1 <= limit <= 5:
        raise ValueError('Invalid query or result limit')
    return query.strip(), limit


def words(value):
    text = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.findall(r'[a-z0-9]+', text)


def lexical_results(documents, query):
    tokens = set(words(query))
    if not tokens:
        return []
    ranked = []
    for doc in documents:
        title = set(words(doc['showTitle'] + ' ' + doc['episodeTitle']))
        summary = set(words(doc['summary']))
        score = len(tokens & title) * 2 + len(tokens & summary)
        if score:
            ranked.append((score, doc['evidenceId']))
    return [eid for _, eid in sorted(ranked, key=lambda x: (-x[0], x[1]))]


def exact_titles(documents, query):
    q = ' '.join(words(query))
    if not q:
        return []
    return [d['evidenceId'] for d in documents if q in (' '.join(words(d['episodeTitle'])), ' '.join(words(d['match']['providerEpisodeTitle'])))]


def merge_rankings(lexical, semantic, allowed):
    scores = {}
    for ranking, weight in ((lexical, 1), (semantic, 2)):
        for i, eid in enumerate(dict.fromkeys(ranking)):
            if eid in allowed:
                scores[eid] = scores.get(eid, 0) + weight / (60 + i + 1)
    return sorted(scores, key=lambda eid: (-scores[eid], eid))


def semantic_candidates(raw, documents=None, query=''):
    """Pilot relevance gate, not a calibrated probability or factual-answer check."""
    if not isinstance(raw, list) or len(raw) > 10:
        return []
    rows = [r for r in raw if isinstance(r, dict) and HEX.fullmatch(str(r.get('evidenceId', '')))
            and type(r.get('distance')) in (int, float) and math.isfinite(r['distance']) and 0 <= r['distance'] <= 2]
    rows.sort(key=lambda r: r['distance'])
    if not rows or rows[0]['distance'] > 0.85:
        return []
    # Near ties need independent rare-word corroboration, not a forced nearest-neighbor answer.
    if len(rows) > 1 and rows[1]['distance'] - rows[0]['distance'] < 0.035:
        documents = documents or {}
        stop = set('a an and are as at be being by do does episode everyone find for from has have he her his i in into is it its me my of on one or our she that the their them then there these they this those to was were what when where which who with you'.split())
        terms = {eid: set(words(doc['text'])) - stop for eid, doc in documents.items()}
        frequencies = Counter(word for tokens in terms.values() for word in tokens)
        rare = {word for word in set(words(query)) - stop if 0 < frequencies[word] <= max(2, len(documents) // 10)}
        return [r['evidenceId'] for r in rows if r['distance'] <= rows[0]['distance'] + 0.12
                and len(terms.get(r['evidenceId'], set()) & rare) >= 2][:5]
    return [r['evidenceId'] for r in rows if r['distance'] <= rows[0]['distance'] + 0.12][:5]


def validate_embedding(raw):
    vector = raw.get('embedding') if isinstance(raw, dict) else None
    if not isinstance(vector, list) or len(vector) != DIMENSIONS or any(type(v) not in (int, float) or not math.isfinite(v) for v in vector):
        raise ValueError('Invalid embedding response')
    return vector


def public_result(doc):
    return {k: doc[k] for k in ('evidenceId', 'showId', 'episodeId', 'sourceId', 'showTitle', 'episodeTitle', 'season', 'number', 'provider', 'sourceUrl', 'license')} | {
        'excerpt': doc['summary'][:350], 'evidenceType': 'episode-summary', 'spoilerScope': 'whole-episode',
    }

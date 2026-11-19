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
MAX_CORPUS_DOCUMENTS = 12000
MAX_CORPUS_BYTES = 16000000
RESERVATION = 10000  # Conservative one-cent allowance per attempted embedding, not a price quote.


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def digest(value):
    return hashlib.sha256(value).hexdigest()


def validate_corpus(raw):
    if not isinstance(raw, dict) or raw.get('version') != 1 or not HEX.fullmatch(str(raw.get('catalogRevision', ''))):
        raise ValueError('Invalid evidence corpus')
    docs = raw.get('documents')
    if not isinstance(docs, list) or not 1 <= len(docs) <= MAX_CORPUS_DOCUMENTS:
        raise ValueError('Corpus document bound exceeded')
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
                or match.get('providerSeason') != doc['season']
                or type(match.get('providerNumber')) is not int or match['providerNumber'] < 1
                or (match.get('providerNumber') != doc['number'] and match.get('method') != 'canonical-title-numbering-variant')):
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


def document_reservation(text):
    """Conservative ingestion-only Titan V2 bound, not a query allowance reduction.

    The published price is $0.02/million tokens. Reserving .025 microUSD per
    UTF-8 byte assumes one token per byte plus a 25% margin. Text is bounded.
    """
    if not isinstance(text, str) or not 1 <= len(text) <= 5000:
        raise ValueError('Invalid embedding text')
    return max(1, math.ceil(len(text.encode('utf-8')) / 40))

def named_series_documents(documents, query):
    """Derive series scope solely from current corpus titles, never fixed aliases."""
    phrase = ' ' + ' '.join(words(re.sub(r'\s*\(\d{4}[^)]*\)\s*$', '', query))) + ' '
    names = {}
    for doc in documents:
        title = re.sub(r'\s*\(\d{4}[^)]*\)\s*$', '', doc['showTitle'])
        title = re.sub(r'^the\s+', '', title, flags=re.I)
        key = ' '.join(words(title))
        if len(key) >= 4 and ' ' + key + ' ' in phrase:
            names[doc['showId']] = len(key)
    if not names:
        return []
    longest = max(names.values())
    selected = {key for key, length in names.items() if length == longest}
    return [doc for doc in documents if doc['showId'] in selected]

def jev_candidates(documents, query, maximum=40):
    """A bounded shortlist; explicit series are scoped before lexical ranking."""
    scope = named_series_documents(documents, query) or documents
    ranked = lexical_results(scope, query)
    by_id = {doc['evidenceId']: doc for doc in scope}
    ordered = [by_id[eid] for eid in ranked if eid in by_id]
    seen = {doc['evidenceId'] for doc in ordered}
    ordered += [doc for doc in scope if doc['evidenceId'] not in seen]
    # Keep all named-series episodes when they fit the provider's bounded state.
    named = bool(named_series_documents(documents, query))
    cap = 100 if named else maximum
    from jev import request_body
    output = []
    for doc in ordered[:cap]:
        proposed = output + [doc]
        try:
            body = request_body(query, proposed)
        except ValueError:
            break
        if len(json.dumps(body, ensure_ascii=False).encode('utf-8')) > 48000:
            break
        output = proposed
    return output

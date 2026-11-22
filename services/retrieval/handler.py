"""IAM-only pilot Lambda. No function URL, HTTP route or generation model."""
import json
import os
import re
import time
from core import (MODEL, DIMENSIONS, canonical_bytes, digest, validate_corpus, validate_query,
                  exact_titles, lexical_results, merge_rankings, semantic_candidates, validate_embedding, public_result, MAX_CORPUS_BYTES, RESERVATION, document_reservation, jev_candidates)
from budget import reserve


class Runtime:
    def __init__(self):
        import boto3
        from botocore.config import Config
        config = Config(retries={'max_attempts': 0}, connect_timeout=3, read_timeout=8)
        self.s3 = boto3.client('s3', config=config)
        self.db = boto3.client('dynamodb', config=config)
        self.bedrock = boto3.client('bedrock-runtime', config=config)
        self.vectors = boto3.client('s3vectors', config=config)
        self.table = os.environ['ALLOWANCE_TABLE']
        self.bucket = os.environ['EVIDENCE_BUCKET']
        self.index = os.environ['VECTOR_INDEX_ARN']

    def read(self, key, maximum):
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        try:
            if response['ContentLength'] > maximum:
                raise ValueError('Evidence object too large')
            data = response['Body'].read(maximum + 1)
            if len(data) > maximum:
                raise ValueError('Evidence object too large')
            return data
        finally:
            response['Body'].close()

    def corpus(self):
        manifest = json.loads(self.read('current.json', 2000))
        revision = manifest['corpusRevision']
        from core import HEX
        if not HEX.fullmatch(revision) or manifest['key'] != f'corpora/{revision}.json':
            raise ValueError('Invalid evidence manifest')
        data = self.read(manifest['key'], MAX_CORPUS_BYTES)
        if digest(data) != revision:
            raise ValueError('Corpus checksum mismatch')
        return validate_corpus(json.loads(data)), revision

    def allowance(self, reservation=RESERVATION):
        reserve(self.db, self.table, int(os.environ['MONTHLY_ALLOWANCE_MICROUSD']), int(os.environ['DAILY_ALLOWANCE_MICROUSD']), reservation=reservation)

    def embed(self, text, *, ingestion=False):
        self.allowance(document_reservation(text) if ingestion else RESERVATION)
        response = self.bedrock.invoke_model(modelId=MODEL, contentType='application/json', accept='application/json',
            body=json.dumps({'inputText': text, 'dimensions': DIMENSIONS, 'normalize': True}))
        try:
            return validate_embedding(json.loads(response['body'].read(50000)))
        finally:
            response['body'].close()

    def query(self, vector, revision):
        response = self.vectors.query_vectors(indexArn=self.index, topK=10, queryVector={'float32': vector},
            filter={'corpusRevision': {'$eq': revision}}, returnDistance=True)
        return [{'evidenceId': x['key'][65:], 'distance': x.get('distance', 2)} for x in response.get('vectors', []) if x.get('key', '').startswith(revision + ':')]

    def cached(self, key, *, embedding=True):
        item = self.db.get_item(TableName=self.table, Key={'pk': {'S': 'yata-search:cache:' + key}}, ConsistentRead=True).get('Item')
        if item and int(item['expiresAt']['N']) > time.time():
            value = json.loads(item['result']['S'])
            if embedding:
                validate_embedding({'embedding': value['vector']})
            return value
        return None

    def cache(self, key, value):
        self.db.put_item(TableName=self.table, Item={'pk': {'S': 'yata-search:cache:' + key},
            'result': {'S': json.dumps(value)}, 'expiresAt': {'N': str(int(time.time()) + 86400)}})

    def jev_key(self):
        if os.environ.get('JEV_ENABLED') != 'true' or not os.environ.get('JEV_SECRET_ARN'):
            raise ValueError('Jev is disabled')
        import boto3
        from botocore.config import Config
        return boto3.client('secretsmanager', config=Config(retries={'max_attempts': 0}, connect_timeout=3, read_timeout=5)).get_secret_value(SecretId=os.environ['JEV_SECRET_ARN'])['SecretString']

    def jev(self, query, documents):
        from jev import choose, request_body
        request_body(query, documents)
        secret=self.jev_key()
        self.allowance()
        return choose(query, documents, secret)

    def classify(self, query):
        from intent import classify, request_body
        request_body(query)
        secret=self.jev_key()
        self.allowance()
        return classify(query,secret)

    def assess_feedback(self, report):
        from feedback import assess, request_body
        request_body(report)
        secret = self.jev_key()
        self.allowance()
        return assess(report, secret)


def feedback_handler(event, *, runtime=None):
    from feedback import validate_event, validate_result, uncertain
    try:
        report = validate_event(event)
    except (ValueError, TypeError, UnicodeError):
        return uncertain()
    try:
        runtime = runtime or Runtime()
        # Feedback may contain personal information: never persist report text or decisions.
        return validate_result(runtime.assess_feedback(report))
    except Exception:
        return uncertain()


def intent_handler(event, *, runtime=None):
    from intent import validate_event, validate_result
    try:
        query=validate_event(event)
    except (ValueError,TypeError):
        return {'version':1,'status':'invalid-request','intent':'clarify','confidence':0}
    try:
        runtime=runtime or Runtime()
        key=digest(canonical_bytes(['intent-v1',query.casefold()]))
        value=runtime.cached(key,embedding=False)
        if value is None:
            value=validate_result(runtime.classify(query))
            try:runtime.cache(key,value)
            except Exception:pass
        return validate_result(value)
    except Exception:
        return {'version':1,'status':'unavailable','intent':'clarify','confidence':0}


def handler(event, context, *, runtime=None):
    if isinstance(event, dict) and event.get("operation") == "feedback":
        return feedback_handler(event, runtime=runtime)
    if isinstance(event,dict) and event.get("operation")=="intent":
        return intent_handler(event,runtime=runtime)
    try:
        query, limit = validate_query(event)
    except (ValueError, TypeError):
        return {'status': 'invalid-request', 'results': []}
    if re.search(r'\b(?:exact words|exact (?:line|dialogue)|verbatim|word for word|current playhead|time[ -]?stamp)\b', query, re.I):
        return {'status': 'unsupported-scope', 'results': [], 'notice': 'This pilot searches untimed episode summaries, not dialogue or scene timestamps.'}
    try:
        runtime = runtime or Runtime()
        corpus, revision = runtime.corpus()
        docs = {d['evidenceId']: d for d in corpus['documents']}
        exact = exact_titles(corpus['documents'], query)
        lexical = lexical_results(corpus['documents'], query)
        kind, degraded = 'exact-title', False
        if exact:
            ids = exact
        elif event.get('strategy') == 'jev':
            from jev import MODEL as JEV_MODEL
            key = digest(canonical_bytes(['jev-choice-shortlist-v3', JEV_MODEL, revision, query.casefold()]))
            cached = runtime.cached(key, embedding=False)
            kind = 'cached-jev' if cached is not None else 'jev-corpus'
            if cached is None:
                candidates = jev_candidates(corpus['documents'], query)
                if not candidates:
                    return {'status': 'ok', 'results': [], 'searchKind': 'no-evidence-match'}
                cached = runtime.jev(query, candidates)
                try:
                    runtime.cache(key, cached)
                except Exception:
                    pass
            ids = [eid for eid in cached.get('ids', []) if eid in docs]
            if not ids and cached.get('decision') == 'possibilities':
                ids = [eid for eid in cached.get('possibleIds', []) if eid in docs][:3]
                kind = 'jev-possibilities'
        else:
            key = digest(canonical_bytes(['candidates-v2', MODEL, DIMENSIONS, revision, query.casefold()]))
            try:
                cached = runtime.cached(key)
                kind = 'cached-hybrid' if cached is not None else 'hybrid'
                if cached is None:
                    vector = runtime.embed(query)
                    cached = {'vector': vector, 'candidates': runtime.query(vector, revision)}
                    try:
                        runtime.cache(key, cached)
                    except Exception:
                        pass  # Cache persistence is best effort; it is not the spend guard.
                semantic = semantic_candidates(cached['candidates'], docs, query)
                ids = merge_rankings(lexical[:10], semantic, set(docs) & set(semantic))
                # No semantic support means no claimed remembered-plot match.
                if not semantic:
                    ids, kind = [], 'no-evidence-match'
            except Exception:
                ids, kind, degraded = lexical[:5], 'keyword-fallback', True
        return {'status': 'ok', 'version': 1, 'catalogRevision': corpus['catalogRevision'], 'corpusRevision': revision,
            'searchKind': kind, 'degraded': degraded, 'results': [public_result(docs[eid]) for eid in ids[:limit] if eid in docs],
            'coverage': {'documents': len(docs), 'type': 'episode-summaries', 'transcripts': False},
            'notice': 'Candidate matches from whole-episode summaries; not scene-aligned. Clients must revalidate catalog identities before playback.'}
    except Exception:
        return {'status': 'unavailable', 'results': []}

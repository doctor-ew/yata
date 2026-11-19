"""IAM-only checkpointed writer; activate only after every chunk is ready."""
import json
import re
from concurrent.futures import ThreadPoolExecutor
from core import digest, validate_corpus, MODEL, DIMENSIONS, validate_embedding, MAX_CORPUS_BYTES, canonical_bytes
from handler import Runtime

CHUNK_SIZE = 200


def checkpoint(corpus, revision, start):
    ids = [d['evidenceId'] for d in corpus['documents'][start:start + CHUNK_SIZE]]
    return {'version': 1, 'corpusRevision': revision, 'start': start, 'count': len(ids),
            'evidenceIdsSha256': digest(canonical_bytes(ids))}


def handler(event, context, *, runtime=None):
    if (not isinstance(event, dict) or set(event) - {'corpusRevision', 'start'}
            or not re.fullmatch('[a-f0-9]{64}', str(event.get('corpusRevision', '')))
            or type(event.get('start', 0)) is not int or event.get('start', 0) < 0
            or event.get('start', 0) % CHUNK_SIZE):
        return {'status': 'invalid-request'}
    runtime = runtime or Runtime()
    revision, start = event['corpusRevision'], event.get('start', 0)
    data = runtime.read(f'corpora/{revision}.json', MAX_CORPUS_BYTES)
    if digest(data) != revision:
        raise ValueError('Corpus checksum mismatch')
    corpus = validate_corpus(json.loads(data))
    if start >= len(corpus['documents']):
        return {'status': 'invalid-request'}
    def stage_document(doc):
        key = f'embeddings/{doc["evidenceId"]}.json'
        try:
            cached = json.loads(runtime.read(key, 50000))
            if cached.get('model') != MODEL or cached.get('dimensions') != DIMENSIONS:
                raise ValueError('Embedding version mismatch')
            vector = validate_embedding(cached)
        except runtime.s3.exceptions.NoSuchKey:
            vector = runtime.embed(doc['text'], ingestion=True)
            runtime.s3.put_object(Bucket=runtime.bucket, Key=key, Body=json.dumps({'model': MODEL, 'dimensions': DIMENSIONS, 'embedding': vector}), ContentType='application/json', IfNoneMatch='*')
        return {'key': revision + ':' + doc['evidenceId'], 'data': {'float32': vector},
            'metadata': {'corpusRevision': revision, 'showId': doc['showId'], 'episodeId': doc['episodeId']}}
    # Four bounded workers keep each resumable chunk comfortably within Lambda's deadline.
    # The completion receipt is written only after every vector operation succeeds.
    with ThreadPoolExecutor(max_workers=4) as pool:
        vectors = list(pool.map(stage_document, corpus['documents'][start:start + CHUNK_SIZE]))
    for offset in range(0, len(vectors), 25):
        runtime.vectors.put_vectors(indexArn=runtime.index, vectors=vectors[offset:offset + 25])
    proof = checkpoint(corpus, revision, start)
    runtime.s3.put_object(Bucket=runtime.bucket, Key=f'ingestion/{revision}/{start}.json', Body=json.dumps(proof), ContentType='application/json')
    next_start = start + CHUNK_SIZE
    if next_start < len(corpus['documents']):
        return {'status': 'staged', 'nextStart': next_start, 'documents': len(corpus['documents']), 'corpusRevision': revision}
    for previous in range(0, start, CHUNK_SIZE):
        actual = json.loads(runtime.read(f'ingestion/{revision}/{previous}.json', 2000))
        if actual != checkpoint(corpus, revision, previous):
            raise ValueError('Incomplete corpus staging')
    runtime.s3.put_object(Bucket=runtime.bucket, Key='current.json', Body=json.dumps({'version': 1, 'corpusRevision': revision,
        'catalogRevision': corpus['catalogRevision'], 'key': f'corpora/{revision}.json'}), ContentType='application/json')
    return {'status': 'ready', 'documents': len(corpus['documents']), 'corpusRevision': revision, 'catalogRevision': corpus['catalogRevision']}

"""Separate IAM-only writer; activation occurs only after every vector is ready."""
import json
import re
from core import digest, validate_corpus, MODEL, DIMENSIONS, validate_embedding
from handler import Runtime


def handler(event, context, *, runtime=None):
    if not isinstance(event, dict) or set(event) != {'corpusRevision'} or not re.fullmatch('[a-f0-9]{64}', str(event.get('corpusRevision', ''))):
        return {'status': 'invalid-request'}
    runtime = runtime or Runtime()
    revision = event['corpusRevision']
    data = runtime.read(f'corpora/{revision}.json', 2000000)
    if digest(data) != revision:
        raise ValueError('Corpus checksum mismatch')
    corpus = validate_corpus(json.loads(data))
    count = 0
    for doc in corpus['documents']:
        # Deterministic IDs make a retry safe; never skip changed source content.
        key = f'embeddings/{doc["evidenceId"]}.json'
        try:
            cached = json.loads(runtime.read(key, 50000))
            if cached.get('model') != MODEL or cached.get('dimensions') != DIMENSIONS:
                raise ValueError('Embedding version mismatch')
            vector = validate_embedding(cached)
        except runtime.s3.exceptions.NoSuchKey:
            vector = runtime.embed(doc['text'])
            runtime.s3.put_object(Bucket=runtime.bucket, Key=key, Body=json.dumps({'model': MODEL, 'dimensions': DIMENSIONS, 'embedding': vector}), ContentType='application/json', IfNoneMatch='*')
        runtime.vectors.put_vectors(indexArn=runtime.index, vectors=[{'key': revision + ':' + doc['evidenceId'], 'data': {'float32': vector},
            'metadata': {'corpusRevision': revision, 'showId': doc['showId'], 'episodeId': doc['episodeId']}}])
        count += 1
    # This pilot has a single named corpus. Never activate partial ingestion.
    runtime.s3.put_object(Bucket=runtime.bucket, Key='current.json', Body=json.dumps({'version': 1, 'corpusRevision': revision,
        'catalogRevision': corpus['catalogRevision'], 'key': f'corpora/{revision}.json'}), ContentType='application/json')
    return {'status': 'ready', 'documents': count, 'corpusRevision': revision, 'catalogRevision': corpus['catalogRevision']}

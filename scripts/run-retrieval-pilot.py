"""Upload verified immutable content and invoke IAM-only functions; no resource creation."""
import argparse
import hashlib
import json
import pathlib
import sys
import subprocess
import urllib.request
import boto3
from botocore.config import Config

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'services/retrieval'))
from core import validate_corpus, digest


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def read_public(url, maximum=15000000):
    with urllib.request.urlopen(url, timeout=20) as response:
        data = response.read(maximum + 1)
        require(len(data) <= maximum, 'Catalog exceeds read bound')
        return data


def verify_bindings(corpus):
    manifest = json.loads(read_public('https://doctorew.com/tv/data/published-catalog-v2-manifest.json', 3000))
    revision = manifest['revision']
    require(corpus['catalogRevision'] == revision, 'Catalog changed; regenerate/review evidence before ingestion')
    require(manifest['catalog'] == f'data/catalogs/{revision}.json', 'Invalid catalog manifest')
    data = read_public('https://doctorew.com/tv/' + manifest['catalog'])
    require(digest(data) == revision, 'Catalog hash mismatch')
    catalog = json.loads(data)
    # Reuse the actual JS domain rules instead of approximating direct playback in Python.
    subprocess.run(['node', '--input-type=module', '-e', """
import {validateCatalog,stationSource} from './src/domain.mjs';
import {standaloneEpisode} from './src/episode-evidence.mjs';
let text='';for await(const chunk of process.stdin)text+=chunk;
const raw=JSON.parse(text),catalog=validateCatalog(raw.catalog);
for(const doc of raw.documents){const show=catalog.shows.find(s=>s.id===doc.showId),episode=show?.episodes.find(e=>e.id===doc.episodeId);
 if(!episode||!standaloneEpisode(episode)||stationSource(episode)?.id!==doc.sourceId)throw Error('Evidence is not a checked standalone direct-video item');}
"""], cwd=ROOT, input=json.dumps({'catalog': catalog, 'documents': corpus['documents']}), text=True, check=True, timeout=20)
    shows = {s['id']: s for s in catalog['shows']}
    for doc in corpus['documents']:
        show = shows.get(doc['showId'])
        episode = next((e for e in show['episodes'] if e['id'] == doc['episodeId']), None) if show else None
        require(episode is not None and episode['kind'] == 'episode' and episode['title'] == doc['episodeTitle']
                and show['title'] == doc['showTitle'] and episode['season'] == doc['season'] and episode['number'] == doc['number'], 'Evidence identity no longer matches catalog')
        require(any(s['id'] == doc['sourceId'] and s['availability'] == 'verified' and s['provider'] in ['archive', 'youtube'] for s in episode['sources']), 'Checked playback identity is no longer available')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--deployment', type=pathlib.Path, required=True)
    parser.add_argument('--corpus', type=pathlib.Path)
    parser.add_argument('--evaluation', type=pathlib.Path)
    parser.add_argument('--out', type=pathlib.Path, required=True)
    parser.add_argument('--strategy', choices=['hybrid', 'jev'], default='hybrid')
    args = parser.parse_args()
    config = json.loads((ROOT / 'deploy/aws-static.json').read_text())
    session = boto3.Session(region_name=config['region'])
    require(session.client('sts').get_caller_identity()['Account'] == config['account'], 'Wrong AWS account')
    outputs = json.loads(args.deployment.read_text())['outputs']
    lam = session.client('lambda', config=Config(read_timeout=920, connect_timeout=5, retries={'max_attempts': 0}))
    s3 = session.client('s3')
    report = {'ingestion': None, 'evaluation': None}

    def invoke(name, payload):
        response = lam.invoke(FunctionName=name, InvocationType='RequestResponse', Payload=json.dumps(payload))
        raw = response['Payload'].read()
        require(not response.get('FunctionError'), 'Lambda operation failed: ' + raw.decode()[:1000])
        return json.loads(raw)

    if args.corpus:
        data = args.corpus.read_bytes()
        corpus = validate_corpus(json.loads(data))
        verify_bindings(corpus)
        revision = digest(data)
        bucket, key = outputs['EvidenceBucket'], f'corpora/{revision}.json'
        require(all(s3.get_public_access_block(Bucket=bucket)['PublicAccessBlockConfiguration'].values()), 'Evidence bucket is not private')
        try:
            s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType='application/json', Metadata={'sha256': revision}, IfNoneMatch='*')
        except s3.exceptions.ClientError as error:
            if error.response['Error']['Code'] != 'PreconditionFailed':
                raise
            require(s3.head_object(Bucket=bucket, Key=key)['Metadata'].get('sha256') == revision, 'Corpus upload conflict')
        report['ingestion'] = invoke(outputs['IngestFunction'], {'corpusRevision': revision})
        require(report['ingestion']['status'] == 'ready', 'Corpus was not activated')
        print(json.dumps(report['ingestion']), flush=True)
    if args.evaluation:
        cases = json.loads(args.evaluation.read_text())
        results = []
        for case in cases['positiveCases']:
            result = invoke(outputs['SearchFunction'], {'query': case['query'], 'limit': 5, 'strategy': args.strategy})
            ids = [r['evidenceId'] for r in result.get('results', [])]
            results.append({'id': case['id'], 'expectedEvidenceId': case['expectedEvidenceId'],
                'rank': ids.index(case['expectedEvidenceId']) + 1 if case['expectedEvidenceId'] in ids else None,
                'searchKind': result.get('searchKind'), 'returnedEvidenceIds': ids})
        negatives = []
        for case in cases.get('negativeCases', []):
            result = invoke(outputs['SearchFunction'], {'query': case['query'], 'limit': 5, 'strategy': args.strategy})
            negatives.append({'id': case['id'], 'results': len(result.get('results', [])), 'searchKind': result.get('searchKind')})
        # Repeat a positive query to exercise the revision-scoped cache.
        cached = invoke(outputs['SearchFunction'], {'query': cases['positiveCases'][0]['query'], 'strategy': args.strategy})
        report['evaluation'] = {'method': 'source-aware developer fixtures, not blind validation', 'strategy': args.strategy, 'positiveCases': results,
            'negativeCases': negatives, 'cacheSearchKind': cached.get('searchKind'),
            'top1': sum(x['rank'] == 1 for x in results), 'top5': sum(x['rank'] is not None for x in results), 'cases': len(results)}
        print(json.dumps(report['evaluation']), flush=True)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()

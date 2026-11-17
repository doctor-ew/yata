"""Owner CLI for the IAM-only episode retrieval pilot; no public credential handoff."""
import argparse
import json
import pathlib
import time
import boto3
from botocore.config import Config

root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--query', required=True)
parser.add_argument('--strategy', choices=['hybrid', 'jev'], default='hybrid')
parser.add_argument('--compare', action='store_true')
args = parser.parse_args()
config = json.loads((root / 'deploy/aws-static.json').read_text())
pilot = json.loads((root / 'deploy/retrieval/pilot.json').read_text())
session = boto3.Session(region_name=config['region'])
if session.client('sts').get_caller_identity()['Account'] != config['account']:
    raise RuntimeError('Wrong AWS account')
client = session.client('lambda', config=Config(connect_timeout=3, read_timeout=30, retries={'max_attempts': 0}))
for strategy in ['hybrid', 'jev'] if args.compare else [args.strategy]:
    started = time.monotonic()
    response = client.invoke(FunctionName=pilot['outputs']['SearchFunction'], Payload=json.dumps({'query': args.query, 'strategy': strategy, 'limit': 5}))
    if response.get('FunctionError'):
        raise RuntimeError('Retrieval function failed')
    data = json.loads(response['Payload'].read())
    print(json.dumps({'strategy': strategy, 'elapsedMs': round((time.monotonic() - started) * 1000), **data}, indent=2))

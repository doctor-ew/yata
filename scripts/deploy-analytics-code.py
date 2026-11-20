"""Update only the existing analytics Lambda code, with revision CAS and rollback backup.
Resource definitions remain in deploy-analytics.py. No IAM/configuration mutation.
"""
import argparse
import base64
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.request
import zipfile
import boto3

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'deploy/aws-static.json').read_text())

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--expected-code-sha256', required=True)
    parser.add_argument('--backup-dir', type=Path, required=True)
    args = parser.parse_args()
    session = boto3.Session(region_name=CONFIG['region'])
    if session.client('sts').get_caller_identity()['Account'] != CONFIG['account']:
        raise RuntimeError('AWS account mismatch')
    client = session.client('lambda')
    current = client.get_function(FunctionName='yata-analytics')
    if current.get('Tags', {}).get('Repository') != 'doctor-ew/yata':
        raise RuntimeError('Function ownership mismatch')
    before = current['Configuration']
    if before['CodeSha256'] != args.expected_code_sha256:
        raise RuntimeError('Lambda changed since review')
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
        info = zipfile.ZipInfo('handler.py', date_time=(2026, 11, 20, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        output.writestr(info, (ROOT / 'services/analytics/handler.py').read_bytes())
    payload = archive.getvalue()
    digest = base64.b64encode(hashlib.sha256(payload).digest()).decode()
    if before['CodeSha256'] == digest:
        print(json.dumps({'function': before['FunctionName'], 'unchanged': True, 'codeSha256': digest}))
        return
    args.backup_dir.mkdir(mode=0o700, parents=True, exist_ok=False)
    with urllib.request.urlopen(current['Code']['Location'], timeout=20) as response:
        backup = response.read(10_000_001)
    if len(backup) > 10_000_000 or base64.b64encode(hashlib.sha256(backup).digest()).decode() != before['CodeSha256']:
        raise RuntimeError('Rollback archive verification failed')
    backup_file = args.backup_dir / 'previous-code.zip'
    backup_file.write_bytes(backup)
    os.chmod(backup_file, 0o600)
    client.update_function_code(FunctionName=before['FunctionName'], ZipFile=payload, RevisionId=before['RevisionId'])
    client.get_waiter('function_updated_v2').wait(FunctionName=before['FunctionName'], WaiterConfig={'Delay': 1, 'MaxAttempts': 50})
    after = client.get_function_configuration(FunctionName=before['FunctionName'])
    if after['CodeSha256'] != digest:
        raise RuntimeError('Deployed code differs from reviewed artifact')
    receipt = {'function': after['FunctionName'], 'previousCodeSha256': before['CodeSha256'], 'codeSha256': digest, 'revisionId': after['RevisionId'], 'backup': str(backup_file)}
    (args.backup_dir / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))

if __name__ == '__main__':
    main()

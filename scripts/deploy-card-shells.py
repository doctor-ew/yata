"""Publish reviewed TV/Arcade shell manifests without modifying the authoritative TV catalog."""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import time


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def main():
    import boto3
    parser = argparse.ArgumentParser()
    parser.add_argument('--tv', type=pathlib.Path)
    parser.add_argument('--arcade', type=pathlib.Path)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--receipt', type=pathlib.Path, required=True)
    args = parser.parse_args()
    require(args.tv or args.arcade, 'Provide at least one built shell directory')
    root = pathlib.Path(__file__).resolve().parents[1]
    config = json.loads((root / 'deploy/aws-static.json').read_text())
    session = boto3.Session(region_name=config['region'])
    require(session.client('sts').get_caller_identity()['Account'] == config['account'], 'Wrong AWS account')
    s3, cf = session.client('s3'), session.client('cloudfront')
    require(all(s3.get_public_access_block(Bucket=config['bucket'])['PublicAccessBlockConfiguration'].values()), 'Public-access blocks must remain enabled')
    require('doctorew.com' in cf.get_distribution_config(Id=config['distribution'])['DistributionConfig']['Aliases']['Items'], 'Wrong distribution')
    require(s3.get_bucket_versioning(Bucket=config['bucket']).get('Status') == 'Enabled', 'Versioned rollback required')
    plans = []
    for prefix, directory in [('tv/', args.tv), ('arcade/', args.arcade)]:
        if directory is None:
            continue
        directory = directory.resolve()
        manifest = json.loads((directory / 'release-manifest.json').read_text())
        for item in manifest['files']:
            name = item['name']
            relative = pathlib.PurePosixPath(name)
            require(not relative.is_absolute() and '..' not in relative.parts and '\\' not in name, 'Unsafe release path')
            require(name != 'data/published-catalog-manifest.json' and not name.startswith('data/catalogs/'), 'Catalog publication is a separate workflow')
            require(not name.endswith('.apk') and not any(p.startswith('.') for p in relative.parts), 'Private artifact in release')
            path = (directory / name).resolve()
            require(path.is_relative_to(directory), 'Release file escaped directory')
            data = path.read_bytes()
            require(hashlib.sha256(data).hexdigest() == item['sha256'], 'Release hash mismatch')
            plans.append({'key': prefix + name, 'data': data, 'item': item})

    def inspect(plan):
        try:
            plan['before'] = s3.head_object(Bucket=config['bucket'], Key=plan['key'])
        except s3.exceptions.ClientError as error:
            if error.response['Error']['Code'] not in ['404', 'NoSuchKey', 'NotFound']:
                raise
            plan['before'] = None
        return plan if not plan['before'] or plan['before'].get('Metadata', {}).get('sha256') != plan['item']['sha256'] else None

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        changed = [p for p in pool.map(inspect, plans) if p]
    receipt = {'apply': args.apply, 'changes': [], 'plannedKeys': [p['key'] for p in changed]}
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2))
    print(json.dumps({'apply': args.apply, 'changedFiles': len(changed)}), flush=True)
    if not args.apply:
        return

    def upload(plan):
        before, item = plan['before'], plan['item']
        condition = {'IfMatch': before['ETag']} if before else {'IfNoneMatch': '*'}
        result = s3.put_object(Bucket=config['bucket'], Key=plan['key'], Body=plan['data'],
                               ContentType=item['contentType'], CacheControl='no-cache, max-age=0' if plan['key'].endswith('index.html') else 'public, max-age=300',
                               Metadata={'sha256': item['sha256']}, **condition)
        return {'key': plan['key'], 'previousVersionId': before.get('VersionId') if before else None,
                'versionId': result.get('VersionId'), 'sha256': item['sha256']}

    # Imported dependencies first, then coordinators, then HTML entry points.
    priority = lambda p: 2 if p['key'].endswith('index.html') else 1 if p['key'] in ['tv/src/app.mjs', 'arcade/arcade.mjs'] else 0
    for group in range(3):
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(upload, p) for p in changed if priority(p) == group]
            for future in concurrent.futures.as_completed(futures):
                receipt['changes'].append(future.result())
                args.receipt.write_text(json.dumps(receipt, indent=2))
    invalidation = cf.create_invalidation(DistributionId=config['distribution'], InvalidationBatch={
        'Paths': {'Quantity': 2, 'Items': ['/tv/*', '/arcade/*']}, 'CallerReference': 'yata-card-shells-' + str(time.time_ns())})
    receipt['invalidationId'] = invalidation['Invalidation']['Id']
    args.receipt.write_text(json.dumps(receipt, indent=2))
    print(json.dumps({'uploaded': len(receipt['changes']), 'invalidationId': receipt['invalidationId']}))


if __name__ == '__main__':
    main()

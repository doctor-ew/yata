"""CloudFormation-only resource lifecycle; no untracked IAM/resource mutations."""
import argparse
import hashlib
import json
import pathlib
import os
import time
import uuid
import boto3

ROOT = pathlib.Path(__file__).resolve().parents[1]
OWNER = 'doctor-ew/yata'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def stack(client, name):
    try:
        value = client.describe_stacks(StackName=name)['Stacks'][0]
        require(any(t['Key'] == 'Repository' and t['Value'] == OWNER for t in value.get('Tags', [])), 'Stack ownership mismatch')
        return value
    except client.exceptions.ClientError as error:
        if 'does not exist' in str(error):
            return None
        raise


def deploy(client, name, template, parameters, apply, receipt):
    old = stack(client, name)
    if old and old['StackStatus'] == 'REVIEW_IN_PROGRESS':
        old = None  # A deleted CREATE change set can leave an empty review placeholder.
    client.validate_template(TemplateBody=template)
    if old:
        require(old['StackStatus'] in ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE'], 'Stack is not ready for an update')
        previous_parameters = [{**p, 'ParameterValue': '[REDACTED]' if p['ParameterKey'] == 'JevApiKey' else p.get('ParameterValue', '')} for p in old.get('Parameters', [])]
        receipt['previous'][name] = {'stackId': old['StackId'], 'parameters': previous_parameters,
                                    'template': client.get_template(StackName=name)['TemplateBody']}
    change = client.create_change_set(StackName=name, ChangeSetName='yata-' + uuid.uuid4().hex,
        ChangeSetType='UPDATE' if old else 'CREATE', TemplateBody=template, Parameters=parameters,
        Capabilities=['CAPABILITY_IAM'], Tags=[{'Key': 'Repository', 'Value': OWNER}])
    planning_deadline = time.monotonic() + 300
    while True:
        require(time.monotonic() < planning_deadline, 'Change-set planning timed out; inspect CloudFormation before retrying')
        result = client.describe_change_set(ChangeSetName=change['Id'])
        if result['Status'] not in ['CREATE_PENDING', 'CREATE_IN_PROGRESS']:
            break
        time.sleep(2)
    if result['Status'] == 'FAILED' and "didn't contain changes" in result.get('StatusReason', ''):
        client.delete_change_set(ChangeSetName=change['Id'])
        return {x['OutputKey']: x['OutputValue'] for x in old.get('Outputs', [])}
    require(result['Status'] == 'CREATE_COMPLETE', 'Change-set creation failed: ' + result.get('StatusReason', 'unknown'))
    changes = [{'action': c['ResourceChange']['Action'], 'type': c['ResourceChange']['ResourceType'],
                'logicalId': c['ResourceChange']['LogicalResourceId'], 'replacement': c['ResourceChange'].get('Replacement')} for c in result['Changes']]
    receipt['changes'][name] = changes
    print(json.dumps({'stack': name, 'changes': changes}), flush=True)
    if not apply:
        client.delete_change_set(ChangeSetName=change['Id'])
        if old is None:
            # Delete only this invocation's empty CREATE placeholder, not an existing stack.
            require(not client.list_stack_resources(StackName=change['StackId'])['StackResourceSummaries'], 'Unexpected resources in planning placeholder')
            client.delete_stack(StackName=change['StackId'])
            client.get_waiter('stack_delete_complete').wait(StackName=change['StackId'], WaiterConfig={'Delay': 2, 'MaxAttempts': 30})
        return None
    require(not any(c['action'] == 'Remove' or c['replacement'] in ['True', 'Conditional'] for c in changes), 'Destructive/replacing change requires a separately reviewed migration')
    client.execute_change_set(ChangeSetName=change['Id'])
    last = None
    deadline = time.monotonic() + 1200
    while True:
        require(time.monotonic() < deadline, 'Deployment polling timed out; inspect the named CloudFormation stack before retrying')
        execution = client.describe_change_set(ChangeSetName=change['Id'])['ExecutionStatus']
        current = stack(client, name)
        status = current['StackStatus']
        if status != last:
            print(json.dumps({'stack': name, 'status': status}), flush=True)
            last = status
        if status in ['CREATE_COMPLETE', 'UPDATE_COMPLETE'] and execution == 'EXECUTE_COMPLETE':
            return {x['OutputKey']: x['OutputValue'] for x in current.get('Outputs', [])}
        if execution == 'EXECUTE_FAILED' or status not in ['CREATE_COMPLETE', 'UPDATE_COMPLETE'] and not status.endswith('IN_PROGRESS'):
            events = client.describe_stack_events(StackName=name)['StackEvents']
            failures = [{'resource': e['LogicalResourceId'], 'reason': e.get('ResourceStatusReason')} for e in events if e['ResourceStatus'].endswith('FAILED')]
            raise RuntimeError(json.dumps({'status': status, 'failures': failures[:8]}))
        time.sleep(3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--artifact', type=pathlib.Path, required=True)
    parser.add_argument('--receipt', type=pathlib.Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--daily-allowance-microusd', type=int, default=1000000)
    parser.add_argument('--enable-jev', action='store_true')
    parser.add_argument('--configure-jev', action='store_true')
    args = parser.parse_args()
    config = json.loads((ROOT / 'deploy/aws-static.json').read_text())
    session = boto3.Session(region_name=config['region'])
    require(session.client('sts').get_caller_identity()['Account'] == config['account'], 'Wrong AWS account')
    cf, s3 = session.client('cloudformation'), session.client('s3')
    receipt = {'apply': args.apply, 'previous': {}, 'changes': {}, 'outputs': {}}
    try:
        assets = deploy(cf, 'yata-retrieval-assets', (ROOT / 'deploy/retrieval/assets.yaml').read_text(), [], args.apply, receipt)
        if not args.apply and not assets:
            print('Bootstrap change set validated. Apply bootstrap before planning the service stack.')
            return
        data = args.artifact.read_bytes()
        checksum = hashlib.sha256(data).hexdigest()
        key = 'retrieval/' + checksum + '.zip'
        if args.apply:
            require(all(s3.get_public_access_block(Bucket=assets['ArtifactsBucket'])['PublicAccessBlockConfiguration'].values()), 'Artifact bucket is not private')
            try:
                s3.put_object(Bucket=assets['ArtifactsBucket'], Key=key, Body=data, Metadata={'sha256': checksum}, IfNoneMatch='*')
            except s3.exceptions.ClientError as error:
                if error.response['Error']['Code'] != 'PreconditionFailed':
                    raise
                require(s3.head_object(Bucket=assets['ArtifactsBucket'], Key=key)['Metadata'].get('sha256') == checksum, 'Artifact conflict')
        require(10000 <= args.daily_allowance_microusd <= 2000000, 'Daily allowance exceeds the reviewed pilot bound')
        parameters = [{'ParameterKey': 'ArtifactBucket', 'ParameterValue': assets['ArtifactsBucket']}, {'ParameterKey': 'ArtifactKey', 'ParameterValue': key},
                      {'ParameterKey': 'DailyAllowanceMicrousd', 'ParameterValue': str(args.daily_allowance_microusd)},
                      {'ParameterKey': 'EnableJev', 'ParameterValue': str(args.enable_jev).lower()}]
        previous = stack(cf, 'yata-episode-retrieval-pilot')
        existing_key = previous and any(p['ParameterKey'] == 'JevApiKey' for p in previous.get('Parameters', []))
        configured_key = previous and any(o['OutputKey'] == 'JevCredentialArn' for o in previous.get('Outputs', []))
        require(not args.enable_jev or not existing_key or args.configure_jev or configured_key, 'Use --configure-jev to supply the initial credential before enabling Jev')
        if existing_key and not args.configure_jev:
            parameters.append({'ParameterKey': 'JevApiKey', 'UsePreviousValue': True})
        else:
            key_value = os.environ.get('TYPESAFE_API_KEY', '') if args.enable_jev or args.configure_jev else ''
            require(not (args.enable_jev or args.configure_jev) or bool(key_value), 'Configure TYPESAFE_API_KEY before enabling the Jev pilot')
            parameters.append({'ParameterKey': 'JevApiKey', 'ParameterValue': key_value})
        outputs = deploy(cf, 'yata-episode-retrieval-pilot', (ROOT / 'deploy/retrieval/stack.yaml').read_text(), parameters, args.apply, receipt)
        receipt.update({'artifactSha256': checksum, 'outputs': outputs})
    finally:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2, default=str) + '\n')


if __name__ == '__main__':
    main()

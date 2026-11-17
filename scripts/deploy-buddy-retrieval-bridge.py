"""Apply a bounded CloudFormation overlay without persisting legacy template secrets."""
import argparse
import copy
import hashlib
import json
import pathlib
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]


def patched_template(template, config, account, region):
    result = copy.deepcopy(template)
    resources = result['Resources']
    function = resources[config['functionLogicalId']]
    role = resources[config['roleLogicalId']]
    if function['Properties']['Role'] != {'Fn::GetAtt': [config['roleLogicalId'], 'Arn']}:
        raise RuntimeError('Chatbot template role reference mismatch')
    if function['Type'] != 'AWS::Lambda::Function' or function['Properties']['FunctionName'] != config['functionName']:
        raise RuntimeError('Unexpected chatbot function')
    role_name = role['Properties']['RoleName']
    if isinstance(role_name, dict) and set(role_name) == {'Fn::Join'}:
        separator, parts = role_name['Fn::Join']
        role_name = separator.join(region if part == {'Ref': 'AWS::Region'} else part for part in parts)
    if role['Type'] != 'AWS::IAM::Role' or role_name != config['roleName']:
        raise RuntimeError('Unexpected chatbot role')
    function['Properties'].setdefault('Environment', {}).setdefault('Variables', {})[config['environmentKey']] = config['retrievalFunction']
    policy = {'Type': 'AWS::IAM::Policy', 'Properties': {'PolicyName': config['policyName'],
        'Roles': [config['roleName']], 'PolicyDocument': {'Version': '2012-10-17', 'Statement': [
        {'Effect': 'Allow', 'Action': 'lambda:InvokeFunction', 'Resource': f"arn:aws:lambda:{region}:{account}:function:{config['retrievalFunction']}"}]}}}
    existing = resources.get('YataEpisodeRetrievalInvokePolicy')
    if existing is not None and existing != policy:
        raise RuntimeError('Existing bridge policy differs from reviewed scope')
    resources['YataEpisodeRetrievalInvokePolicy'] = policy
    return result


def main():
    import boto3
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--receipt', type=pathlib.Path, required=True)
    args = parser.parse_args()
    config = json.loads((ROOT / 'deploy/retrieval/buddy-bridge.json').read_text())
    aws = json.loads((ROOT / 'deploy/aws-static.json').read_text())
    session = boto3.Session(region_name=aws['region'])
    if session.client('sts').get_caller_identity()['Account'] != aws['account']:
        raise RuntimeError('Wrong AWS account')
    cf, lam = session.client('cloudformation'), session.client('lambda')
    stack = cf.describe_stacks(StackName=config['stack'])['Stacks'][0]
    if stack['StackStatus'] not in ['UPDATE_COMPLETE', 'CREATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']:
        raise RuntimeError('Backend stack is not ready')
    before = lam.get_function_configuration(FunctionName=config['functionName'])
    expected_role = f"arn:aws:iam::{aws['account']}:role/{config['roleName']}"
    if before['Role'] != expected_role:
        raise RuntimeError('Chatbot role mismatch')
    template = cf.get_template(StackName=config['stack'])['TemplateBody']
    template = json.loads(template) if isinstance(template, str) else template
    # CloudFormation references are resolved only for a comparison; never copy secrets into receipts.
    template_environment = template['Resources'][config['functionLogicalId']]['Properties']['Environment']['Variables']
    physical = {r['LogicalResourceId']: r.get('PhysicalResourceId') for r in cf.list_stack_resources(StackName=config['stack'])['StackResourceSummaries']}
    resolved = {k: physical.get(v.get('Ref')) if isinstance(v, dict) and set(v) == {'Ref'} else v for k, v in template_environment.items()}
    live_environment = before.get('Environment', {}).get('Variables', {})
    if resolved != live_environment:
        raise RuntimeError('Existing environment drift; reconcile before applying the bridge')
    updated = patched_template(template, config, aws['account'], aws['region'])
    body = json.dumps(updated)
    cf.validate_template(TemplateBody=body)
    change = cf.create_change_set(StackName=config['stack'], ChangeSetName='yata-buddy-' + uuid.uuid4().hex,
        ChangeSetType='UPDATE', TemplateBody=body, Capabilities=['CAPABILITY_NAMED_IAM'],
        Parameters=[{'ParameterKey': p['ParameterKey'], 'UsePreviousValue': True} for p in stack.get('Parameters', [])])
    receipt = {'apply': args.apply, 'stack': config['stack'], 'changeSetId': change['Id'],
               'templateSha256': hashlib.sha256(body.encode()).hexdigest(), 'codeSha256Before': before['CodeSha256']}
    try:
        deadline = time.monotonic() + 300
        while True:
            if time.monotonic() > deadline:
                raise RuntimeError('Change-set planning timed out')
            state = cf.describe_change_set(ChangeSetName=change['Id'])
            if state['Status'] not in ['CREATE_PENDING', 'CREATE_IN_PROGRESS']:
                break
            time.sleep(2)
        if state['Status'] == 'FAILED' and "didn't contain changes" in state.get('StatusReason', ''):
            cf.delete_change_set(ChangeSetName=change['Id'])
            receipt['unchanged'] = True
            return
        if state['Status'] != 'CREATE_COMPLETE':
            raise RuntimeError('Bridge change-set planning failed')
        changes = [c['ResourceChange'] for c in state.get('Changes', [])]
        receipt['changes'] = [{k: c.get(k) for k in ['Action', 'LogicalResourceId', 'ResourceType', 'Replacement']} for c in changes]
        allowed = {config['functionLogicalId']: {'Modify'}, 'YataEpisodeRetrievalInvokePolicy': {'Add', 'Modify'}}
        # Stable named function: its ARN does not change on an environment-only update.
        # CloudFormation nevertheless flags unchanged GetAtt consumers as conditional updates.
        dependents = {'ApiGatewayMethodChatbotPost': 'AWS::ApiGateway::Method', 'ChatbotLambdaPermissionApiGateway': 'AWS::Lambda::Permission'}
        for c in changes:
            logical = c['LogicalResourceId']
            if logical in dependents:
                if (c['ResourceType'] != dependents[logical] or template['Resources'][logical] != updated['Resources'][logical]
                    or c['Action'] != 'Modify' or c.get('Replacement') not in ['False', 'Conditional']):
                    raise RuntimeError('Unexpected API dependency change')
                allowed[logical] = {'Modify'}
        if any(c['Action'] not in allowed.get(c['LogicalResourceId'], set()) or (c['Action']=='Modify' and c.get('Replacement') != 'False' and c['LogicalResourceId'] not in dependents) for c in changes):
            cf.delete_change_set(ChangeSetName=change['Id'])
            raise RuntimeError('Bridge change set exceeds reviewed resources')
        if not args.apply:
            cf.delete_change_set(ChangeSetName=change['Id'])
            return
        # Detect a concurrent code rollout before CloudFormation touches configuration.
        if lam.get_function_configuration(FunctionName=config['functionName'])['RevisionId'] != before['RevisionId']:
            raise RuntimeError('Chatbot changed while planning; re-plan')
        cf.execute_change_set(ChangeSetName=change['Id'])
        deadline = time.monotonic() + 600
        while True:
            if time.monotonic() > deadline:
                raise RuntimeError('Bridge execution timed out; inspect CloudFormation')
            state = cf.describe_change_set(ChangeSetName=change['Id'])
            current = cf.describe_stacks(StackName=config['stack'])['Stacks'][0]['StackStatus']
            if state['ExecutionStatus'] == 'EXECUTE_COMPLETE' and current == 'UPDATE_COMPLETE':
                break
            if state['ExecutionStatus'] == 'EXECUTE_FAILED' or current.endswith('FAILED') or current == 'UPDATE_ROLLBACK_COMPLETE':
                raise RuntimeError('Bridge CloudFormation update failed')
            time.sleep(3)
        after = lam.get_function_configuration(FunctionName=config['functionName'])
        if after['Role'] != before['Role']:
            raise RuntimeError('Unexpected chatbot role change')
        if after['CodeSha256'] != before['CodeSha256']:
            raise RuntimeError('Unexpected chatbot code change during configuration update')
        if after.get('Environment', {}).get('Variables', {}) != {**live_environment, config['environmentKey']: config['retrievalFunction']}:
            raise RuntimeError('Retrieval function configuration missing')
        receipt.update({'status': 'UPDATE_COMPLETE', 'codePreserved': True, 'revisionId': after['RevisionId']})
    finally:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, indent=2) + '\n')
        print(json.dumps(receipt))


if __name__ == '__main__':
    main()

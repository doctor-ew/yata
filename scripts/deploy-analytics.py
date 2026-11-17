"""Deploy the owned anonymous collector and private AWS dashboard; no credentials are written."""
import boto3
import concurrent.futures
import io
import json
import pathlib
import secrets
import time
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'deploy/aws-static.json').read_text())
session = boto3.Session(region_name=CONFIG['region'])
assert session.client('sts').get_caller_identity()['Account'] == CONFIG['account']
lam, api, iam, logs, cw = (session.client(service) for service in ['lambda', 'apigateway', 'iam', 'logs', 'cloudwatch'])
assert any(m['restApiId'] == 'ijbm65duxl' and m['stage'] == 'dev' for m in api.get_base_path_mappings(domainName='skippyts.doctorew.com')['items'])
existing = lam.get_function_configuration(FunctionName='langchain-chatbot-dev-chatbot')
table = existing['Environment']['Variables']['AI_GUARD_TABLE']
assert session.client('dynamodb').describe_table(TableName=table)['Table']['KeySchema'] == [{'AttributeName': 'pk', 'KeyType': 'HASH'}]
assert session.client('dynamodb').describe_time_to_live(TableName=table)['TimeToLiveDescription']['AttributeName'] == 'expiresAt'
name, role_name, log_group = 'yata-analytics', 'yata-anonymous-analytics', '/aws/lambda/yata-analytics'
try:
    current = lam.get_function(FunctionName=name)
    assert current.get('Tags', {}).get('Repository') == 'doctor-ew/yata'
except lam.exceptions.ResourceNotFoundException:
    current = None
secret = current['Configuration']['Environment']['Variables']['ANALYTICS_SECRET'] if current else secrets.token_hex(32)
trust = {'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Principal': {'Service': 'lambda.amazonaws.com'}, 'Action': 'sts:AssumeRole'}]}
try:
    role = iam.get_role(RoleName=role_name)['Role']
except iam.exceptions.NoSuchEntityException:
    role = iam.create_role(RoleName=role_name, AssumeRolePolicyDocument=json.dumps(trust), Tags=[{'Key': 'Repository', 'Value': 'doctor-ew/yata'}])['Role']
assert any(t['Key'] == 'Repository' and t['Value'] == 'doctor-ew/yata' for t in iam.list_role_tags(RoleName=role_name)['Tags'])
policy = {'Version': '2012-10-17', 'Statement': [
    {'Effect': 'Allow', 'Action': ['logs:CreateLogStream', 'logs:PutLogEvents'], 'Resource': f'arn:aws:logs:{CONFIG["region"]}:{CONFIG["account"]}:log-group:{log_group}:*'},
    {'Effect': 'Allow', 'Action': ['dynamodb:PutItem', 'dynamodb:UpdateItem'], 'Resource': f'arn:aws:dynamodb:{CONFIG["region"]}:{CONFIG["account"]}:table/{table}', 'Condition': {'ForAllValues:StringLike': {'dynamodb:LeadingKeys': ['yata-analytics:*']}}}
]}
iam.put_role_policy(RoleName=role_name, PolicyName='anonymous-events-only', PolicyDocument=json.dumps(policy))
try:
    logs.create_log_group(logGroupName=log_group, tags={'Repository': 'doctor-ew/yata'})
except logs.exceptions.ResourceAlreadyExistsException:
    pass
logs.put_retention_policy(logGroupName=log_group, retentionInDays=30)
archive = io.BytesIO()
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as output:
    output.write(ROOT / 'services/analytics/handler.py', 'handler.py')
kwargs = dict(FunctionName=name, Runtime='python3.13', Role=role['Arn'], Handler='handler.handler', Timeout=10, MemorySize=128, Environment={'Variables': {'ANALYTICS_SECRET': secret, 'ANALYTICS_GUARD_TABLE': table}})
if current:
    lam.update_function_code(FunctionName=name, ZipFile=archive.getvalue(), RevisionId=current['Configuration']['RevisionId'])
    lam.get_waiter('function_updated_v2').wait(FunctionName=name)
    lam.update_function_configuration(**kwargs)
else:
    for attempt in range(12):
        try:
            lam.create_function(**kwargs, Code={'ZipFile': archive.getvalue()}, Tags={'Repository': 'doctor-ew/yata'})
            break
        except lam.exceptions.InvalidParameterValueException:
            if attempt == 11:
                raise
            time.sleep(5)
lam.get_waiter('function_active_v2').wait(FunctionName=name)
lam.put_function_concurrency(FunctionName=name, ReservedConcurrentExecutions=2)
resources = api.get_resources(restApiId='ijbm65duxl')['items']
root = next(r for r in resources if r['path'] == '/')
resource = next((r for r in resources if r['path'] == '/analytics'), None) or api.create_resource(restApiId='ijbm65duxl', parentId=root['id'], pathPart='analytics')
arn = lam.get_function_configuration(FunctionName=name)['FunctionArn']
for method in ['POST', 'OPTIONS']:
    try:
        api.put_method(restApiId='ijbm65duxl', resourceId=resource['id'], httpMethod=method, authorizationType='NONE')
    except api.exceptions.ConflictException:
        pass
    api.put_integration(restApiId='ijbm65duxl', resourceId=resource['id'], httpMethod=method, type='AWS_PROXY', integrationHttpMethod='POST', uri=f'arn:aws:apigateway:{CONFIG["region"]}:lambda:path/2015-03-31/functions/{arn}/invocations')
    try:
        lam.add_permission(FunctionName=name, StatementId='analytics-'+method.lower(), Action='lambda:InvokeFunction', Principal='apigateway.amazonaws.com', SourceArn=f'arn:aws:execute-api:{CONFIG["region"]}:{CONFIG["account"]}:ijbm65duxl/dev/{method}/analytics')
    except lam.exceptions.ResourceConflictException:
        pass
stage = api.get_stage(restApiId='ijbm65duxl', stageName='dev')
previous = stage['deploymentId']
deployment = api.create_deployment(restApiId='ijbm65duxl', stageName='dev', description='YATA anonymous usage collector; existing AI routes unchanged')
api.update_stage(restApiId='ijbm65duxl', stageName='dev', patchOperations=[
    {'op':'replace','path':'/~1analytics/POST/throttling/rateLimit','value':'5'},
    {'op':'replace','path':'/~1analytics/POST/throttling/burstLimit','value':'10'},
    {'op':'replace','path':'/~1analytics/POST/logging/dataTrace','value':'false'},
    {'op':'replace','path':'/~1analytics/POST/logging/loglevel','value':'OFF'}
])
source = f"SOURCE '{log_group}' | filter type = 'yata_usage' and version != '0.0.0' | "
queries = [
    ('App launches by platform (not unique people)', "filter metric = 'app_open' | stats sum(value) as launches by platform, version | sort launches desc"),
    ('Channel plays', "filter metric = 'play_start' | stats sum(value) as plays by channel, platform | sort plays desc"),
    ('Foreground playback hours by channel', "filter metric = 'watch_seconds' | stats sum(value)/3600 as hours by channel, platform | sort hours desc"),
    ('AI request outcomes and web handoffs', "filter metric like /^ai_/ | stats sum(value) as events by metric, host, platform | sort events desc"),
    ('Playback failures (one per attempted source)', "filter metric = 'play_error' | stats sum(value) as failures by channel, provider, platform | sort failures desc"),
    ('Feedback drafts and arcade unlocks', "filter metric in ['feedback_draft','arcade_unlock'] | stats sum(value) as events by metric, platform | sort events desc")
]
widgets = [{'type':'text','x':0,'y':0,'width':24,'height':3,'properties':{'markdown':'# YATA anonymous usage\nPrivate owner dashboard · last 7 days by default. Counts are client-reported, not unique viewers or audited audience figures. Watch time covers confirmed foreground playback only; screen-off native audio is excluded. AI success means a response was returned, not that its answer was useful. No chat text, email, private URL or persistent viewer ID is collected. Event logs retain 30 days. Refresh only when needed.'}}]
for i, (title, query) in enumerate(queries):
    widgets.append({'type':'log','x':(i%2)*12,'y':3+(i//2)*7,'width':12,'height':7,'properties':{'region':CONFIG['region'],'title':title,'view':'table','query':source+query}})
dashboard = {'start':'-P7D','widgets':widgets}
result = cw.put_dashboard(DashboardName='YATA-Usage', DashboardBody=json.dumps(dashboard))
assert not result.get('DashboardValidationMessages'), result.get('DashboardValidationMessages')
(ROOT/'deploy/analytics-dashboard.json').write_text(json.dumps(dashboard, indent=2)+'\n')
receipt = {'function':name,'route':'https://skippyts.doctorew.com/analytics','logGroup':log_group,'dashboard':'YATA-Usage','dashboardUrl':'https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards/dashboard/YATA-Usage','previousDeployment':previous,'deployment':deployment['id'],'retentionDays':30,'apiRequestsPerSecond':5,'perIpHourlyBatchLimit':600,'globalDailyBatchLimit':100000}
print(json.dumps(receipt, indent=2))

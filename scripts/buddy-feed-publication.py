"""Validate public buddy data and prove finite backend acceptance before publication."""
import json
import subprocess
from pathlib import Path


def validated_feed(data, root):
    code = "import {validateBuddyFeed} from './src/buddy-registry.mjs';let s='';for await(const c of process.stdin)s+=c;process.stdout.write(JSON.stringify(validateBuddyFeed(JSON.parse(s))));"
    result = subprocess.run(['node', '--input-type=module', '-e', code], cwd=root,
                            input=data, capture_output=True, timeout=15, check=True)
    return json.loads(result.stdout)


def verify_backend(feed, client, function_name):
    for profile in feed['personas']:
        event = {'path': '/chatbot', 'httpMethod': 'POST', 'headers': {'origin': 'https://doctorew.com', 'Content-Type': 'application/json'},
                 'requestContext': {'identity': {'sourceIp': '192.0.2.247'}},
                 'body': json.dumps({'mode': 'buddy', 'personality': profile['id'], 'question': 'Roster validation.', 'sessionToken': 'invalid-roster-canary'})}
        result = client.invoke(FunctionName=function_name, Payload=json.dumps(event).encode())
        if result.get('StatusCode') != 200 or result.get('FunctionError'):
            raise RuntimeError('Buddy backend acceptance check unavailable')
        response = json.loads(result['Payload'].read())
        if response.get('statusCode') != 401:
            raise RuntimeError('Buddy is not accepted by the guarded backend: ' + profile['id'])
    return len(feed['personas'])

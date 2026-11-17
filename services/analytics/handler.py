"""Allowlisted anonymous usage events. Never log request bodies or request metadata."""
import datetime
import hashlib
import hmac
import json
import os
import re

METRICS = {'app_open', 'play_start', 'watch_seconds', 'play_error', 'ai_attempt', 'ai_success', 'ai_failure', 'ai_cancel', 'ai_handoff', 'feedback_draft', 'arcade_unlock'}
CHANNELS = {'none', 'mixed', 'action', 'scifi', 'cartoons', 'nick', 'comedy', 'drama', 'seventies', 'late-night', 'custom', 'library', 'movies'}
HOSTS = {'none', 'stubing', 'arnold', 'jabberjaw', 'benson', 'mrt', 'murdock', 'twiki', 'starbuck', 'horshack', 'fonz', 'revjim', 'mrsgarrett', 'mrmagoo', 'kitt', 'docbrown', 'statlerwaldorf', 'qbert', 'skeletor'}
ORIGINS = {'https://doctorew.com', 'https://www.doctorew.com', 'https://localhost', 'capacitor://localhost'}


def validate(body):
    if not isinstance(body, dict) or set(body) != {'batch', 'events'} or not isinstance(body['batch'], str) or not re.fullmatch(r'[a-f0-9]{32}', body['batch']):
        raise ValueError('Invalid batch')
    events = body['events']
    if not isinstance(events, list) or not 1 <= len(events) <= 10:
        raise ValueError('Invalid events')
    cleaned = []
    for e in events:
        if not isinstance(e, dict) or set(e) != {'metric', 'channel', 'platform', 'provider', 'host', 'version', 'value'}:
            raise ValueError('Invalid fields')
        if (not isinstance(e['metric'], str) or e['metric'] not in METRICS
            or not isinstance(e['channel'], str) or e['channel'] not in CHANNELS
            or e['platform'] not in ['web', 'android', 'ios']
            or e['provider'] not in ['none', 'archive', 'youtube', 'tubi']
            or not isinstance(e['host'], str) or e['host'] not in HOSTS
            or not isinstance(e['version'], str) or not re.fullmatch(r'\d{1,2}\.\d{1,2}\.\d{1,2}', e['version'])
            or type(e['value']) is not int or not 1 <= e['value'] <= (30 if e['metric'] == 'watch_seconds' else 1)):
            raise ValueError('Invalid values')
        cleaned.append(dict(e))
    return cleaned


def quota(table, secret, batch, ip, now):
    epoch = int(now.timestamp())
    day = now.strftime('%Y-%m-%d')
    hour = now.strftime('%Y-%m-%dT%H')
    # Rotating hourly hash is used only for throttling, never copied into event logs.
    ip_hash = hmac.new(secret.encode(), (hour + '\0' + ip).encode(), hashlib.sha256).hexdigest()
    items = [{'Put': {'TableName': table, 'Item': {'pk': {'S': 'yata-analytics:batch:' + batch}, 'expiresAt': {'N': str(epoch + 3600)}}, 'ConditionExpression': 'attribute_not_exists(pk)'}}]
    for key, cap, ttl in [(f'yata-analytics:ip:{hour}:{ip_hash}', 600, epoch + 7200), (f'yata-analytics:day:{day}', 100000, epoch + 172800)]:
        items.append({'Update': {'TableName': table, 'Key': {'pk': {'S': key}}, 'UpdateExpression': 'SET expiresAt = :ttl ADD #used :one', 'ConditionExpression': 'attribute_not_exists(#used) OR #used < :cap', 'ExpressionAttributeNames': {'#used': 'used'}, 'ExpressionAttributeValues': {':ttl': {'N': str(ttl)}, ':one': {'N': '1'}, ':cap': {'N': str(cap)}}}})
    return {'TransactItems': items}


def handler(event, _context, *, dynamo=None, emit=print):
    headers = {str(k).lower(): v for k, v in (event.get('headers') or {}).items()}
    origin = headers.get('origin', '')
    response_headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff'}
    if origin in ORIGINS:
        response_headers.update({'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'})
    def respond(code):
        return {'statusCode': code, 'headers': response_headers, 'body': ''}
    if origin not in ORIGINS:
        return respond(403)
    if event.get('httpMethod') == 'OPTIONS':
        return respond(204)
    if event.get('httpMethod') != 'POST':
        return respond(405)
    raw = event.get('body') or ''
    if not isinstance(raw, str) or event.get('isBase64Encoded') or len(raw.encode()) > 10000 or not re.match(r'^application/json(?:\s*;|$)', headers.get('content-type', ''), re.I):
        return respond(400)
    try:
        events = validate(json.loads(raw))
    except (ValueError, TypeError):
        return respond(400)
    ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp')
    secret, table = os.environ.get('ANALYTICS_SECRET'), os.environ.get('ANALYTICS_GUARD_TABLE')
    if not ip or not secret or not table:
        return respond(503)
    try:
        if dynamo is None:
            import boto3
            dynamo = boto3.client('dynamodb')
        dynamo.transact_write_items(**quota(table, secret, json.loads(raw)['batch'], ip, datetime.datetime.now(datetime.timezone.utc)))
    except Exception:
        return respond(429)
    # Only these validated fields reach CloudWatch. No text, URL, identifier, IP or headers.
    for item in events:
        emit(json.dumps({'type': 'yata_usage', **item}, separators=(',', ':')))
    return respond(204)

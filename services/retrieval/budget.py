"""Atomic conservative allowances. Failed or ambiguous calls are not refunded."""
import datetime
import uuid
from core import RESERVATION


def reserve(client, table, monthly, daily, *, now=None, receipt=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    expiry = int(now.timestamp()) + 95 * 86400
    transactions = []
    for period, cap in [(now.strftime('%Y-%m'), monthly), (now.strftime('%Y-%m-%d'), daily)]:
        if type(cap) is not int or cap < RESERVATION:
            raise ValueError('Allowance disabled')
        transactions.append({'Update': {
            'TableName': table, 'Key': {'pk': {'S': 'yata-search:allowance:' + period}},
            'UpdateExpression': 'SET #used = if_not_exists(#used, :zero) + :cost, expiresAt = :ttl',
            'ConditionExpression': 'attribute_not_exists(#used) OR #used <= :remaining',
            'ExpressionAttributeNames': {'#used': 'reservedMicrousd'},
            'ExpressionAttributeValues': {':zero': {'N': '0'}, ':cost': {'N': str(RESERVATION)}, ':remaining': {'N': str(cap - RESERVATION)}, ':ttl': {'N': str(expiry)}},
        }})
    receipt = receipt or uuid.uuid4().hex
    transactions.append({'Put': {'TableName': table, 'Item': {
        'pk': {'S': 'yata-search:receipt:' + receipt}, 'reservedMicrousd': {'N': str(RESERVATION)}, 'expiresAt': {'N': str(expiry)},
    }, 'ConditionExpression': 'attribute_not_exists(pk)'}})
    client.transact_write_items(TransactItems=transactions, ClientRequestToken=receipt)

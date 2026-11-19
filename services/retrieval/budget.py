"""Atomic conservative allowances. Failed or ambiguous calls are not refunded."""
import datetime
import uuid
import threading
from core import RESERVATION

_RESERVATION_LOCK = threading.Lock()


def reserve(client, table, monthly, daily, *, now=None, receipt=None, reservation=RESERVATION):
    if type(reservation) is not int or not 1 <= reservation <= RESERVATION:
        raise ValueError('Invalid allowance reservation')
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
            'ExpressionAttributeValues': {':zero': {'N': '0'}, ':cost': {'N': str(reservation)}, ':remaining': {'N': str(cap - reservation)}, ':ttl': {'N': str(expiry)}},
        }})
    receipt = receipt or uuid.uuid4().hex
    transactions.append({'Put': {'TableName': table, 'Item': {
        'pk': {'S': 'yata-search:receipt:' + receipt}, 'reservedMicrousd': {'N': str(reservation)}, 'expiresAt': {'N': str(expiry)},
    }, 'ConditionExpression': 'attribute_not_exists(pk)'}})
    # Serialize this container's ledger writes while embedding I/O remains parallel.
    with _RESERVATION_LOCK:
        client.transact_write_items(TransactItems=transactions, ClientRequestToken=receipt)

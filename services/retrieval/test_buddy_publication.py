"""Offline public-roster publication gates; no live Lambda or provider calls."""
import importlib.util
import io
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('buddy_publication', ROOT / 'scripts/buddy-feed-publication.py')
publication = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publication)


class Backend:
    def __init__(self, status=401, error=False):
        self.calls = []; self.status = status; self.error = error
    def invoke(self, **kwargs):
        self.calls.append(kwargs)
        return {'StatusCode': 200, **({'FunctionError': 'Unhandled'} if self.error else {}),
                'Payload': io.BytesIO(json.dumps({'statusCode': self.status}).encode())}


class PublicationTests(unittest.TestCase):
    def test_each_profile_probes_invalid_session_without_paid_request_credentials(self):
        backend = Backend()
        feed = {'personas': [{'id': 'arnold'}, {'id': 'twiki'}]}
        self.assertEqual(publication.verify_backend(feed, backend, 'fixture-function'), 2)
        for call, profile in zip(backend.calls, feed['personas']):
            self.assertEqual(call['FunctionName'], 'fixture-function')
            event = json.loads(call['Payload']); body = json.loads(event['body'])
            self.assertEqual(event['path'], '/chatbot')
            self.assertEqual(body['personality'], profile['id'])
            self.assertEqual(body['sessionToken'], 'invalid-roster-canary')
            self.assertEqual(body['mode'], 'buddy')
            self.assertNotIn('turnstileToken', body)
            self.assertNotIn('retrievalQuery', body)

    def test_unknown_profile_or_unavailable_guard_stops_publication(self):
        for status in (200, 400, 403, 429, 503):
            with self.subTest(status=status), self.assertRaises(RuntimeError):
                publication.verify_backend({'personas': [{'id': 'fixture'}]}, Backend(status), 'fixture-function')
        with self.assertRaises(RuntimeError):
            publication.verify_backend({'personas': [{'id': 'fixture'}]}, Backend(error=True), 'fixture-function')

    def test_actual_shipped_feed_passes_canonical_js_validator(self):
        raw = (ROOT / 'data/buddy-personas.json').read_bytes()
        result = publication.validated_feed(raw, ROOT)
        self.assertTrue(result['personas'])
        self.assertEqual(result['version'], 1)
        self.assertEqual(len({p['id'] for p in result['personas']}), len(result['personas']))

    def test_invalid_asset_is_rejected_before_any_backend_check(self):
        raw = json.loads((ROOT / 'data/buddy-personas.json').read_text())
        raw['personas'][0]['image'] = 'https://attacker.example/portrait.jpg'
        with self.assertRaises(Exception):
            publication.validated_feed(json.dumps(raw).encode(), ROOT)


if __name__ == '__main__': unittest.main()

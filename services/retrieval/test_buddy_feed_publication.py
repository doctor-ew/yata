import importlib.util
import io
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('buddy_feed_publication',ROOT/'scripts/buddy-feed-publication.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PublicationTests(unittest.TestCase):
    def test_canary_proves_guard_acceptance_without_a_valid_session(self):
        class Client:
            def invoke(self,**kwargs):
                event=json.loads(kwargs['Payload']);body=json.loads(event['body'])
                self.assertions=(body['sessionToken']=='invalid-roster-canary' and body['mode']=='buddy' and event['headers']['origin']=='https://doctorew.com')
                return {'StatusCode':200,'Payload':io.BytesIO(b'{"statusCode":401}')}
        client=Client();self.assertEqual(module.verify_backend({'personas':[{'id':'twiki'}]},client,'fixture'),1);self.assertTrue(client.assertions)
    def test_unknown_host_or_service_error_rejects_publication(self):
        for reply in [{'StatusCode':200,'Payload':io.BytesIO(b'{"statusCode":400}')},{'StatusCode':200,'FunctionError':'Unhandled'}]:
            class Client:
                def invoke(self,**kwargs):return reply
            with self.assertRaises(RuntimeError):module.verify_backend({'personas':[{'id':'unknown'}]},Client(),'fixture')

if __name__=='__main__':unittest.main()

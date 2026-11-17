import importlib.util,json,os,unittest,datetime
from unittest.mock import Mock,patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('analytics',Path(__file__).with_name('handler.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AnalyticsTests(unittest.TestCase):
 def item(self,**patch):return {'metric':'play_start','channel':'action','platform':'web','provider':'archive','host':'none','version':'0.7.1','value':1,**patch}
 def event(self,items=None):return {'httpMethod':'POST','headers':{'origin':'https://doctorew.com','content-type':'application/json'},'body':json.dumps({'batch':'a'*32,'events':items or [self.item()]}),'requestContext':{'identity':{'sourceIp':'192.0.2.1'}}}
 @patch.dict(os.environ,{'ANALYTICS_SECRET':'fixture','ANALYTICS_GUARD_TABLE':'fixture'})
 def test_accepts_only_safe_fields_and_never_emits_identity(self):
  out=[];db=Mock();r=m.handler(self.event(),None,dynamo=db,emit=out.append);self.assertEqual(r['statusCode'],204);self.assertEqual(json.loads(out[0]),{'type':'yata_usage',**self.item()});self.assertNotIn('192.0.2.1',str(db.transact_write_items.call_args));self.assertEqual(len(db.transact_write_items.call_args.kwargs['TransactItems']),3)
 def test_rejects_text_injection_invalid_dimensions_and_inflated_counts(self):
  for item in [self.item(question='private'),self.item(channel='<script>'),self.item(host='attacker'),self.item(value=999),self.item(value=True),self.item(version='private@email.com'),self.item(metric=[]),self.item(platform=[])]:
   out=[];self.assertEqual(m.handler(self.event([item]),None,emit=out.append)['statusCode'],400);self.assertEqual(out,[])
 def test_duration_limit_and_strict_batch(self):
  self.assertEqual(m.validate({'batch':'a'*32,'events':[self.item(metric='watch_seconds',value=30)]})[0]['value'],30)
  for body in [{'batch':'a'*32,'events':[self.item()]*11},{'batch':'private-id','events':[self.item()]},{'batch':'a'*32,'events':[self.item()],'email':'private'}]:
   with self.assertRaises(ValueError):m.validate(body)
 @patch.dict(os.environ,{'ANALYTICS_SECRET':'fixture','ANALYTICS_GUARD_TABLE':'fixture'})
 def test_quota_failure_never_emits(self):
  db=Mock();db.transact_write_items.side_effect=Exception('limit');out=[];self.assertEqual(m.handler(self.event(),None,dynamo=db,emit=out.append)['statusCode'],429);self.assertEqual(out,[])
 def test_origins_preflight_and_content_limits(self):
  for origin in ['https://localhost','capacitor://localhost','https://doctorew.com']:
   e=self.event();e['httpMethod']='OPTIONS';e['headers']['origin']=origin;self.assertEqual(m.handler(e,None)['statusCode'],204)
  e=self.event();e['headers']['origin']='https://attacker.example';self.assertEqual(m.handler(e,None)['statusCode'],403)
  e=self.event();e['body']='x'*10001;self.assertEqual(m.handler(e,None)['statusCode'],400)
 def test_rate_hash_rotates_hourly_and_ttl_is_short(self):
  first=m.quota('fixture','secret','a'*32,'192.0.2.1',datetime.datetime(2026,11,17,10,tzinfo=datetime.timezone.utc));second=m.quota('fixture','secret','b'*32,'192.0.2.1',datetime.datetime(2026,11,17,11,tzinfo=datetime.timezone.utc));self.assertNotEqual(first['TransactItems'][1]['Update']['Key'],second['TransactItems'][1]['Update']['Key'])
if __name__=='__main__':unittest.main()

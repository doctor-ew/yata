"""Offline bridge-overlay scope checks. Fixtures contain no production credentials."""
import copy
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('buddy_bridge_deploy', ROOT / 'scripts/deploy-buddy-retrieval-bridge.py')
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)
CONFIG = json.loads((ROOT / 'deploy/retrieval/buddy-bridge.json').read_text())
ACCOUNT = '111111111111'
REGION = 'us-east-1'


def fixture():
    return {'Metadata': {'fixture': 'not-a-production-template'}, 'Resources': {
        CONFIG['functionLogicalId']: {'Type': 'AWS::Lambda::Function', 'Properties': {
            'FunctionName': CONFIG['functionName'], 'Role': {'Fn::GetAtt': [CONFIG['roleLogicalId'], 'Arn']},
            'Code': {'S3Bucket': 'fixture-artifacts', 'S3Key': 'original.zip'},
            'Environment': {'Variables': {'EXISTING_FIXTURE_VALUE': 'preserve-this-value'}}}},
        CONFIG['roleLogicalId']: {'Type': 'AWS::IAM::Role', 'Properties': {
            'RoleName': CONFIG['roleName'], 'Policies': [{'PolicyName': 'fixture-existing', 'PolicyDocument': {'Statement': []}}]}},
        'OtherFunction': {'Type': 'AWS::Lambda::Function', 'Properties': {'FunctionName': 'fixture-other',
            'Environment': {'Variables': {'OTHER': 'untouched'}}}},
    }}


class BuddyBridgeTests(unittest.TestCase):
    def patch(self, template):
        return bridge.patched_template(template, CONFIG, ACCOUNT, REGION)

    def test_only_chatbot_environment_and_new_exact_policy_change(self):
        original = fixture(); frozen = copy.deepcopy(original)
        actual = self.patch(original)
        expected = copy.deepcopy(original)
        expected['Resources'][CONFIG['functionLogicalId']]['Properties']['Environment']['Variables'][CONFIG['environmentKey']] = CONFIG['retrievalFunction']
        policy = actual['Resources']['YataEpisodeRetrievalInvokePolicy']
        self.assertEqual(policy, {'Type': 'AWS::IAM::Policy', 'Properties': {
            'PolicyName': CONFIG['policyName'], 'Roles': [CONFIG['roleName']], 'PolicyDocument': {
                'Version': '2012-10-17', 'Statement': [{'Effect': 'Allow', 'Action': 'lambda:InvokeFunction',
                    'Resource': f"arn:aws:lambda:{REGION}:{ACCOUNT}:function:{CONFIG['retrievalFunction']}"}]}}})
        expected['Resources']['YataEpisodeRetrievalInvokePolicy'] = policy
        self.assertEqual(actual, expected)
        self.assertEqual(original, frozen)

    def test_overlay_is_idempotent(self):
        once = self.patch(fixture())
        self.assertEqual(self.patch(once), once)

    def test_preexisting_policy_conflict_is_rejected(self):
        original = self.patch(fixture())
        original['Resources']['YataEpisodeRetrievalInvokePolicy']['Properties']['PolicyDocument']['Statement'][0]['Resource'] = '*'
        with self.assertRaises(RuntimeError):
            self.patch(original)

    def test_unexpected_function_or_named_role_is_rejected(self):
        for logical, key in [(CONFIG['functionLogicalId'], 'FunctionName'), (CONFIG['roleLogicalId'], 'RoleName')]:
            template = fixture(); template['Resources'][logical]['Properties'][key] = 'unexpected'
            with self.assertRaises(RuntimeError):
                self.patch(template)

    def test_region_join_for_known_role_is_accepted(self):
        template = fixture()
        prefix, suffix = CONFIG['roleName'].split(REGION)
        template['Resources'][CONFIG['roleLogicalId']]['Properties']['RoleName'] = {'Fn::Join': ['', [prefix, {'Ref': 'AWS::Region'}, suffix]]}
        self.assertEqual(self.patch(template)['Resources']['YataEpisodeRetrievalInvokePolicy']['Properties']['Roles'], [CONFIG['roleName']])

    def test_function_must_reference_the_reviewed_role(self):
        for role in [{'Fn::GetAtt': ['ForeignRole', 'Arn']}, f'arn:aws:iam::{ACCOUNT}:role/foreign', None]:
            template = fixture()
            template['Resources'][CONFIG['functionLogicalId']]['Properties']['Role'] = role
            with self.assertRaises(RuntimeError):
                self.patch(template)


if __name__ == '__main__':
    unittest.main()

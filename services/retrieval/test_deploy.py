import importlib.util
import pathlib
import unittest
from unittest.mock import Mock, patch

root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('deploy_retrieval', root / 'scripts/deploy-retrieval.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeploymentTests(unittest.TestCase):
    def test_old_complete_status_does_not_finish_an_unexecuted_change_set(self):
        client = Mock()
        client.get_template.return_value = {'TemplateBody': 'previous-template'}
        old = {'StackId': 'owned', 'StackStatus': 'UPDATE_COMPLETE', 'Tags': [{'Key': 'Repository', 'Value': deploy.OWNER}], 'Outputs': [{'OutputKey': 'edition', 'OutputValue': 'old'}]}
        fresh = {**old, 'Outputs': [{'OutputKey': 'edition', 'OutputValue': 'new'}]}
        client.describe_stacks.side_effect = [{'Stacks': [old]}, {'Stacks': [old]}, {'Stacks': [fresh]}]
        client.create_change_set.return_value = {'Id': 'specific-change'}
        client.describe_change_set.side_effect = [
            {'Status': 'CREATE_COMPLETE', 'Changes': []}, {'ExecutionStatus': 'EXECUTE_IN_PROGRESS'}, {'ExecutionStatus': 'EXECUTE_COMPLETE'}]
        with patch.object(deploy.time, 'sleep'):
            result = deploy.deploy(client, 'fixture', 'template', [], True, {'previous': {}, 'changes': {}})
        self.assertEqual(result, {'edition': 'new'})
        self.assertEqual(client.describe_change_set.call_args.kwargs['ChangeSetName'], 'specific-change')

    def test_replacing_resource_plan_is_not_executed(self):
        client = Mock()
        client.get_template.return_value = {'TemplateBody': 'previous-template'}
        client.describe_stacks.return_value = {'Stacks': [{'StackId': 'owned', 'StackStatus': 'UPDATE_COMPLETE', 'Tags': [{'Key': 'Repository', 'Value': deploy.OWNER}]}]}
        client.create_change_set.return_value = {'Id': 'specific-change'}
        client.describe_change_set.return_value = {'Status': 'CREATE_COMPLETE', 'Changes': [{'ResourceChange': {'Action': 'Modify', 'ResourceType': 'AWS::S3::Bucket', 'LogicalResourceId': 'Evidence', 'Replacement': 'True'}}]}
        with self.assertRaisesRegex(RuntimeError, 'Destructive'):
            deploy.deploy(client, 'fixture', 'template', [], True, {'previous': {}, 'changes': {}})
        client.execute_change_set.assert_not_called()


if __name__ == '__main__':
    unittest.main()

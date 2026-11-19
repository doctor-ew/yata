import unittest
from unittest.mock import Mock,patch
import intent
import handler

class IntentTests(unittest.TestCase):
    def raw(self,choice='build-channel',score=.98,confidence=.96):
        scores={key:(1-score)/(len(intent.INTENTS)-1) for key in intent.INTENTS};scores[choice]=score
        return {'answers':{'route':{'type':'choice','choice':choice,'confidence':confidence,'probabilities':scores}}}
    def test_only_complete_finite_high_confidence_choices_are_actions(self):
        self.assertEqual(intent.select(self.raw())['intent'],'build-channel')
        for raw in [self.raw(score=.55),self.raw(confidence=.5)]:self.assertEqual(intent.select(raw)['intent'],'clarify')
        raw=self.raw();raw['answers']['route']['choice']='https://evil.example'
        with self.assertRaises(ValueError):intent.select(raw)
        raw=self.raw();del raw['answers']['route']['probabilities']['conversation']
        with self.assertRaises(ValueError):intent.select(raw)
    def test_raw_viewer_text_is_only_data_and_has_no_generated_arguments(self):
        query="Let's create a channel with He-Man, Battlestar Galactica, and transformers"
        body=intent.request_body(query);self.assertEqual(body['state'],{'viewerMessage':query});self.assertEqual(set(body['questions']['route']['criteria']),set(intent.INTENTS));self.assertNotIn(query,body['questions']['route']['instructions'])
    def test_cache_prevents_duplicate_provider_work_and_never_reads_episode_corpus(self):
        runtime=Mock();runtime.cached.return_value=intent.select(self.raw())
        result=handler.handler({'operation':'intent','query':'Please make my channel'},None,runtime=runtime)
        self.assertEqual(result['intent'],'build-channel');runtime.classify.assert_not_called();runtime.corpus.assert_not_called()
    def test_failure_does_not_guess_an_action_or_retry_another_provider(self):
        runtime=Mock();runtime.cached.return_value=None;runtime.classify.side_effect=TimeoutError()
        result=handler.handler({'operation':'intent','query':'Please make my channel'},None,runtime=runtime)
        self.assertEqual(result['status'],'unavailable');self.assertEqual(result['intent'],'clarify');runtime.embed.assert_not_called();runtime.jev.assert_not_called()
        runtime.classify.assert_called_once()
    def test_malformed_input_rejected_before_paid_work(self):
        for event in [{'operation':'intent','query':'x'*1001},{'operation':'intent','query':'hi','url':'https://evil.example'},{'operation':'intent','query':''}]:
            runtime=Mock();result=handler.handler(event,None,runtime=runtime);self.assertEqual(result['status'],'invalid-request');runtime.classify.assert_not_called()
    def test_allowance_blocks_intent_provider_before_network(self):
        runtime=object.__new__(handler.Runtime);runtime.jev_key=Mock(return_value='fixture');runtime.allowance=Mock(side_effect=RuntimeError('cap'))
        with patch('intent.classify') as call:
            with self.assertRaises(RuntimeError):runtime.classify('Make a channel')
            call.assert_not_called()

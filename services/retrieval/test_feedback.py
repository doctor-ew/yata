import unittest
from unittest.mock import Mock, patch
import feedback
import handler

REPORT = {'version': 1, 'messages': [{'text': 'I clicked Requests & bugs and nothing happened.', 'answerTo': None}]}

class FeedbackTests(unittest.TestCase):
    def choice(self, allowed, choice, score=.98, confidence=.98):
        scores = {key: (1-score)/(len(allowed)-1) for key in allowed}
        scores[choice] = score
        return {'type':'choice','choice':choice,'confidence':confidence,'probabilities':scores}
    def raw(self, step='ready'):
        return {'answers': {'kind': self.choice(feedback.KINDS, 'bug'), 'next': self.choice(feedback.NEXT, step)}}
    def test_strict_bounded_feedback_only_context(self):
        self.assertEqual(feedback.request_body(REPORT)['state'], {'report': REPORT})
        bad_reports=[{}, {**REPORT,'history':[]}, {'version':True,'messages':REPORT['messages']}, {**REPORT,'messages':[]}, {**REPORT,'messages':[{'text':'x','answerTo':'execute'}]}, {**REPORT,'messages':[{'text':'x'*1001,'answerTo':None}]}, {**REPORT,'messages':[{'text':'x'*900,'answerTo':None}]*3}]
        for value in bad_reports:
            with self.subTest(value=str(value)[:50]), self.assertRaises((ValueError,TypeError)):
                feedback.validate_event({'operation':'feedback','report':value})
    def test_finite_distributions_and_abstention(self):
        self.assertEqual(feedback.select(self.raw())['next'],'ready')
        self.assertEqual(feedback.select(self.raw('actual'))['next'],'actual')
        raw=self.raw();raw['answers']['kind']=self.choice(feedback.KINDS,'bug',score=.55)
        self.assertEqual(feedback.select(raw)['status'],'clarify')
        for change in ['unknown','incomplete','nan']:
            raw=self.raw()
            if change=='unknown':raw['answers']['next']['choice']='https://evil.example'
            elif change=='incomplete':del raw['answers']['next']['probabilities']['actual']
            else:raw['answers']['kind']['confidence']=float('nan')
            with self.assertRaises(ValueError):feedback.select(raw)
        self.assertEqual(feedback.select(self.raw('clarify'))['status'],'clarify')
    def test_feedback_is_not_cached_and_does_not_read_corpus(self):
        runtime=Mock();runtime.assess_feedback.return_value=feedback.select(self.raw())
        for _ in range(2):
            self.assertEqual(handler.handler({'operation':'feedback','report':REPORT},None,runtime=runtime)['status'],'assessed')
        self.assertEqual(runtime.assess_feedback.call_count,2)
        for method in [runtime.cached,runtime.cache,runtime.corpus,runtime.embed]:method.assert_not_called()
    def test_limits_and_failures_do_not_invoke_or_retry(self):
        runtime=Mock()
        self.assertEqual(handler.handler({'operation':'feedback','report':REPORT,'url':'bad'},None,runtime=runtime)['status'],'unavailable')
        runtime.assess_feedback.assert_not_called()
        runtime.assess_feedback.side_effect=TimeoutError()
        self.assertEqual(handler.handler({'operation':'feedback','report':REPORT},None,runtime=runtime)['status'],'unavailable')
        runtime.assess_feedback.assert_called_once()
    def test_allowance_denial_precedes_paid_work(self):
        runtime=object.__new__(handler.Runtime);runtime.jev_key=Mock(return_value='fixture');runtime.allowance=Mock(side_effect=RuntimeError('cap'))
        with patch('feedback.assess') as call:
            with self.assertRaises(RuntimeError):runtime.assess_feedback(REPORT)
            call.assert_not_called()
    def test_cache_contract_rejects_extra_fields_and_inconsistent_fallbacks(self):
        good=feedback.select(self.raw())
        for value in [{**good,'url':'bad'},{**good,'confidence':.3},{**good,'next':'clarify'},{**feedback.uncertain(),'kind':'bug'}]:
            with self.assertRaises(ValueError):feedback.validate_result(value)

import json
import unittest
from unittest.mock import Mock
from test_retrieval import document
import jev


class JevTests(unittest.TestCase):
    def response(self, doc, **changes):
        raw = {'model': 'fixture', 'answers': {'supported': {'type': 'noul', 'noul': .98},
            'pick': {'type': 'choice', 'choice': doc['evidenceId'], 'confidence': .95, 'probabilities': {doc['evidenceId']: .98, 'none': .02}}}}
        raw.update(changes)
        return raw

    def test_typed_result_selects_only_fixed_corpus_identity(self):
        doc = document()
        result = jev.select(self.response(doc), [doc])
        self.assertEqual(result['ids'], [doc['evidenceId']])
        raw = self.response(doc)
        raw['answers']['pick']['choice'] = 'https://attacker.example'
        with self.assertRaises(ValueError):
            jev.select(raw, [doc])

    def test_no_support_and_uncertainty_cannot_select_a_story(self):
        doc = document()
        raw = self.response(doc)
        raw['answers']['supported']['noul'] = .01
        self.assertEqual(jev.select(raw, [doc])['ids'], [])

    def test_incomplete_or_unnormalized_distributions_cannot_fabricate_a_margin(self):
        doc = document()
        for scores in [{doc['evidenceId']: .99}, {doc['evidenceId']: .99, 'none': .8}]:
            raw = self.response(doc)
            raw['answers']['pick']['probabilities'] = scores
            with self.assertRaises(ValueError):
                jev.select(raw, [doc])
        raw = self.response(doc)
        raw['answers']['pick']['confidence'] = .3
        self.assertEqual(jev.select(raw, [doc])['ids'], [])

    def test_request_is_bounded_and_separates_instructions_from_evidence(self):
        doc = document()
        body = jev.request_body('remember mechanic', [doc])
        self.assertIn(doc['evidenceId'], body['questions']['pick']['criteria'])
        self.assertEqual(body['state']['query'], 'remember mechanic')
        self.assertNotIn('sourceUrl', json.dumps(body))
        with self.assertRaises(ValueError):
            jev.request_body('test', [document(n) for n in range(1, 102)])


if __name__ == '__main__':
    unittest.main()

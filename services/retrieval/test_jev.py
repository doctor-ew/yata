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

    def test_supported_split_distribution_offers_manual_possibilities_without_exact_selection(self):
        one, two = document(), document(2)
        raw = self.response(one)
        raw['answers']['pick'].update(confidence=.55, probabilities={one['evidenceId']:.53, two['evidenceId']:.45, 'none':.02})
        result = jev.select(raw, [one, two])
        self.assertEqual(result['ids'], [])
        self.assertEqual(result['possibleIds'], [one['evidenceId'], two['evidenceId']])
        self.assertEqual(result['decision'], 'possibilities')
        raw['answers']['supported']['noul'] = .2
        self.assertEqual(jev.select(raw, [one, two])['possibleIds'], [])
        raw['answers']['supported']['noul'] = .98
        raw['answers']['pick']['probabilities'] = {one['evidenceId']:.8, two['evidenceId']:.1, 'none':.1}
        self.assertEqual(jev.select(raw, [one, two])['possibleIds'], [])

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

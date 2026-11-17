import datetime
import importlib
import json
import pathlib
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import core
import budget
import handler
import ingest


def document(number=1):
    record = {'showId': 'fixture', 'episodeId': 'episode-' + str(number), 'sourceId': 'source-' + str(number),
        'catalogRevision': 'a' * 64, 'showTitle': 'Fixture Show', 'episodeTitle': 'An Honest Mechanic',
        'season': 1, 'number': number, 'summary': 'An honest mechanic helps a rider escape criminals.',
        'text': 'Fixture Show — An Honest Mechanic\nAn honest mechanic helps a rider escape criminals.',
        'provider': 'TVmaze', 'sourceUrl': f'https://www.tvmaze.com/episodes/{number}/fixture', 'license': 'CC BY-SA',
        'match': {'method': 'unique-title', 'providerShowId': 1, 'providerEpisodeId': number,
                  'providerEpisodeTitle': 'An Honest Mechanic', 'providerSeason': 1, 'providerNumber': number}}
    return {'evidenceId': core.digest(core.canonical_bytes(record)), **record, 'fetchedAt': '2026-11-17T00:00:00Z'}


class EvidenceTests(unittest.TestCase):
    def test_dialogue_and_playhead_requests_abstain_before_paid_work(self):
        runtime = Mock()
        for query in ['What are the exact words spoken twelve minutes into the episode?', 'Recap up to my current playhead']:
            result = handler.handler({'query': query}, None, runtime=runtime)
            self.assertEqual(result['status'], 'unsupported-scope')
        runtime.corpus.assert_not_called()

    def test_optional_jev_failure_does_not_silently_invoke_a_second_paid_provider(self):
        runtime = Mock()
        runtime.corpus.return_value = ({'catalogRevision': 'a' * 64, 'documents': [document()]}, 'b' * 64)
        runtime.cached.return_value = None
        runtime.jev.side_effect = TimeoutError('provider unavailable')
        result = handler.handler({'query': 'remember a rider', 'strategy': 'jev'}, None, runtime=runtime)
        self.assertEqual(result['status'], 'unavailable')
        runtime.embed.assert_not_called()
        runtime.cache.assert_not_called()

    def test_checked_corpus_rejects_tampered_identity_and_provider_evidence(self):
        d = document()
        corpus = {'version': 1, 'catalogRevision': 'a' * 64, 'documents': [d]}
        self.assertIs(core.validate_corpus(corpus), corpus)
        for changes in [{'summary': 'invented'}, {'sourceUrl': 'https://attacker.example/script'}, {'number': 3}]:
            with self.assertRaises(ValueError):
                core.validate_corpus({**corpus, 'documents': [{**d, **changes}]})

    def test_input_does_not_enable_writer_modes_http_or_client_urls(self):
        for request in [{'query': 'mechanic', 'corpusRevision': 'b' * 64}, {'query': 'mechanic', 'url': 'https://attacker.example'},
                        {'query': 'x' * 301}, {'query': 'a\nb'}, {'query': 'test', 'limit': True}, {'httpMethod': 'POST'}]:
            runtime = Mock()
            self.assertEqual(handler.handler(request, None, runtime=runtime)['status'], 'invalid-request')
            runtime.corpus.assert_not_called()

    def test_external_vectors_cannot_inject_documents_or_playback_urls(self):
        doc = document()
        runtime = Mock()
        runtime.corpus.return_value = ({'catalogRevision': 'a' * 64, 'documents': [doc]}, 'b' * 64)
        runtime.cached.return_value = {'vector': [0.0] * 512, 'candidates': [{'evidenceId': 'https://attacker.example', 'distance': 0.1}, {'evidenceId': doc['evidenceId'], 'distance': 0.2}]}
        result = handler.handler({'query': 'remember a rider'}, None, runtime=runtime)
        self.assertEqual(len(result['results']), 1)
        self.assertNotIn('url', result['results'][0])
        self.assertNotIn('text', result['results'][0])
        self.assertEqual(result['results'][0]['spoilerScope'], 'whole-episode')
        runtime.embed.assert_not_called()

    def test_allowance_failure_prevents_model_call_and_returns_keyword_fallback(self):
        runtime = object.__new__(handler.Runtime)
        runtime.allowance = Mock(side_effect=RuntimeError('limit'))
        runtime.bedrock = Mock()
        with self.assertRaises(RuntimeError):
            runtime.embed('rider')
        runtime.bedrock.invoke_model.assert_not_called()
        fake = Mock()
        fake.corpus.return_value = ({'catalogRevision': 'a' * 64, 'documents': [document()]}, 'b' * 64)
        fake.cached.return_value = None
        fake.embed.side_effect = RuntimeError('limit')
        result = handler.handler({'query': 'mechanic rider'}, None, runtime=fake)
        self.assertEqual(result['searchKind'], 'keyword-fallback')
        self.assertTrue(result['degraded'])
        fake.query.assert_not_called()

    def test_atomic_allowance_reserves_both_periods_and_unique_receipt(self):
        db = Mock()
        budget.reserve(db, 'fixture', 3000000, 1000000, now=datetime.datetime(2026, 11, 17, tzinfo=datetime.timezone.utc), receipt='a' * 32)
        items = db.transact_write_items.call_args.kwargs['TransactItems']
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]['Update']['Key']['pk']['S'], 'yata-search:allowance:2026-11')
        self.assertEqual(items[1]['Update']['Key']['pk']['S'], 'yata-search:allowance:2026-11-17')
        self.assertEqual(items[0]['Update']['ExpressionAttributeValues'][':remaining']['N'], str(3000000 - core.RESERVATION))
        self.assertIn('ConditionExpression', items[2]['Put'])

    def test_partial_ingestion_never_activates_a_corpus(self):
        doc = document()
        corpus = {'version': 1, 'catalogRevision': 'a' * 64, 'documents': [doc, document(2)]}
        data = core.canonical_bytes(corpus)
        runtime = Mock()
        class Missing(Exception):
            pass
        runtime.s3.exceptions.NoSuchKey = Missing
        runtime.read.side_effect = [data, Missing(), Missing()]
        runtime.embed.side_effect = [[0.0] * 512, RuntimeError('stopped')]
        with self.assertRaises(RuntimeError):
            ingest.handler({'corpusRevision': core.digest(data)}, None, runtime=runtime)
        self.assertTrue(runtime.vectors.put_vectors.called)
        self.assertFalse(any(c.kwargs.get('Key') == 'current.json' for c in runtime.s3.put_object.call_args_list))
        key = runtime.vectors.put_vectors.call_args.kwargs['vectors'][0]['key']
        self.assertTrue(key.startswith(core.digest(data) + ':'))

    def test_vector_filter_pins_corpus_and_rejects_stale_or_distant_candidates(self):
        runtime = object.__new__(handler.Runtime)
        runtime.vectors = Mock()
        runtime.index = 'fixture'
        runtime.vectors.query_vectors.return_value = {'vectors': [
            {'key': 'b' * 64 + ':' + 'a' * 64, 'distance': 0.2},
            {'key': 'c' * 64 + ':' + 'a' * 64, 'distance': 0.1},
            {'key': 'b' * 64 + ':' + 'd' * 64, 'distance': 0.9}]}
        candidates = runtime.query([0.0] * 512, 'b' * 64)
        self.assertEqual(candidates[0], {'evidenceId': 'a' * 64, 'distance': 0.2})
        self.assertEqual(core.semantic_candidates(candidates), ['a' * 64])
        self.assertEqual(runtime.vectors.query_vectors.call_args.kwargs['filter'], {'corpusRevision': {'$eq': 'b' * 64}})

    def test_embeddings_reject_invalid_or_nonfinite_dimensions(self):
        for value in [[], [0.0] * 511, [float('nan')] * 512, [True] * 512]:
            with self.assertRaises(ValueError):
                core.validate_embedding({'embedding': value})

    def test_relevance_gate_accepts_clear_candidates_and_abstains_on_near_ties(self):
        a, b = 'a' * 64, 'b' * 64
        self.assertEqual(core.semantic_candidates([{'evidenceId': a, 'distance': 0.612}, {'evidenceId': b, 'distance': 0.707}]), [a, b])
        self.assertEqual(core.semantic_candidates([{'evidenceId': a, 'distance': 0.79}, {'evidenceId': b, 'distance': 0.80}]), [])
        self.assertEqual(core.semantic_candidates([{'evidenceId': a, 'distance': 0.99}]), [])

    def test_near_ties_need_rare_source_words_and_do_not_force_an_absent_plot(self):
        a, b = 'a' * 64, 'b' * 64
        rows = [{'evidenceId': a, 'distance': 0.76}, {'evidenceId': b, 'distance': 0.762}]
        docs = {a: {'text': 'A sorcerer captures a castle.'}, b: {'text': 'A magical mirror frees a mischievous spirit.'}}
        self.assertEqual(core.semantic_candidates(rows, docs, 'a mischievous magical being'), [b])
        self.assertEqual(core.semantic_candidates(rows, docs, 'a purple robot opens a bakery'), [])


if __name__ == '__main__':
    unittest.main()

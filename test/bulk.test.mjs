import test from 'node:test';
import assert from 'node:assert/strict';
import { youtubeEpisodes, mergeBatch } from '../src/bulk.mjs';
import { createSeed } from '../src/catalog.mjs';
import { buildSchedule } from '../src/domain.mjs';
test('playlist metadata expands videos with unknown runtimes and bounded size', () => {
 const entries = youtubeEpisodes({ entries: [{ id: 'M7lc1UVf-VE', title: 'S01E02 Example', duration: 90 }, { id: 'RmycafPZFl8', title: 'Unknown' }] });
 assert.equal(entries[0].season, 1); assert.equal(entries[0].number, 2);
 assert.equal(entries[1].durationSeconds, null); assert.equal(entries[0].sources[0].availability, 'unverified');
 assert.throws(() => youtubeEpisodes({ entries: Array(201).fill({}) }), /1–200/);
 assert.throws(() => youtubeEpisodes({ entries: [{ id: 'bad', title: 'Invalid' }] }));
});
test('approval preserves existing data, skips duplicates and rejects invalid batches atomically', () => {
 const original = createSeed(), before = JSON.stringify(original);
 const episode = youtubeEpisodes({ id: 'M7lc1UVf-VE', title: 'Sample', duration: 90 })[0]; let n = 0;
 const result = mergeBatch(original, [{ selected: true, showId: 'he-man', episode }, { selected: true, showId: 'transformers', episode }, { selected: false, showId: 'gi-joe', episode }], () => String(++n));
 assert.equal(result.added, 1); assert.equal(result.skipped, 1); assert.equal(JSON.stringify(original), before);
 assert.equal(result.catalog.settings.channel, original.settings.channel);
 assert.equal(buildSchedule(result.catalog).length, buildSchedule(original).length);
 assert.throws(() => mergeBatch(original, [{ selected: true, showId: 'missing', episode }]));
 assert.equal(JSON.stringify(original), before);
});

test('official-channel season formats are parsed without treating playlist order as a known season', () => {
 for (const title of ['Season 1 | E03 | Hasbro Pulse', 'Mini Series | S02 | E05 | Full Episode']) {
  const episode = youtubeEpisodes({ id: 'M7lc1UVf-VE', title })[0];
  assert.equal(episode.season, title.startsWith('Season') ? 1 : 2);
  assert.equal(episode.number, title.startsWith('Season') ? 3 : 5);
 }
});

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

test('whole-library import combines explicit episode alternatives and is repeat-safe without changing user metadata', async () => {
 const { mergeLibraryBatch, discoveryRows } = await import('../src/bulk.mjs');
 const catalog = createSeed(); catalog.settings.channel = 'cartoons';
 const existing = catalog.shows.find(s => s.id === 'dukes').episodes[0];
 const incoming = structuredClone(existing); incoming.title = 'The Dukes of Hazzard S01E05 High Octane.mp4';
 incoming.sources = [{ id: 'alternate', provider: 'youtube', url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', availability: 'unverified' }];
 incoming.sources.push({ ...incoming.sources[0], id: 'duplicate-in-row' });
 const packs = [{ shows: [{ showId: 'dukes', episodes: [incoming] }] }];
 const rows = discoveryRows(catalog, packs); let n = 0;
 const first = mergeLibraryBatch(catalog, rows, () => String(++n));
 assert.equal(first.added, 0); assert.equal(first.alternatives, 1);
 const episode = first.catalog.shows.find(s => s.id === 'dukes').episodes[0];
 assert.equal(episode.title, 'High Octane'); assert.equal(episode.sources.length, 2);
 assert.equal(first.catalog.settings.channel, 'cartoons');
 assert.equal(existing.sources.length, 1);
 const again = mergeLibraryBatch(first.catalog, rows);
 assert.equal(again.added, 0); assert.equal(again.alternatives, 0); assert.equal(again.skipped, 1);
 assert.throws(() => discoveryRows(catalog, [{ shows: [{ showId: 'missing', episodes: [] }] }]), /unknown show/);
 incoming.sources[0].url = 'https://example.com/bad';
 assert.throws(() => mergeLibraryBatch(catalog, [{ selected: true, showId: 'dukes', episode: incoming }]));
 assert.equal(existing.sources.length, 1);
});

test('provider numbering collisions never attach a different story as an alternate', async () => {
 const { mergeLibraryBatch } = await import('../src/bulk.mjs');
 const catalog = createSeed();
 const episode = structuredClone(catalog.shows.find(s => s.id === 'gi-joe').episodes[0]);
 episode.title = '1. The Pyramid of Darkness Part 1';
 episode.sources = [{ id: 'pyramid', provider: 'youtube', url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', availability: 'unverified' }];
 const result = mergeLibraryBatch(catalog, [{ selected: true, showId: 'gi-joe', episode }]);
 assert.equal(result.added, 1); assert.equal(result.alternatives, 0);
 assert.equal(result.catalog.shows.find(s => s.id === 'gi-joe').episodes.length, 2);
});

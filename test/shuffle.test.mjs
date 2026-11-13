import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, schedulePosition, validateCatalog, saveCatalog, readCatalog } from '../src/domain.mjs';
import { adjacentPlayback } from '../src/transport.mjs';
function episode(show, number, group = '') {
 return { id: `${show}-${number}`, title: `${show} episode ${number}`, season: 1, number, group, kind: 'episode', durationSeconds: 10,
 sources: [{ id: `source-${show}-${number}`, provider: 'youtube', url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE', availability: 'verified' }] };
}
function fixture() {
 return { version: 1, epoch: 1000, settings: { channel: 'mixed', bumpers: false, rotation: 'random', shuffleSeed: 42, storiesPerTurn: 1, streamShow: null },
 shows: [['a', 'action', 6], ['b', 'cartoons', 2], ['c', 'cartoons', 3]].map(([id, channel, count]) => ({ id, channel, title: id, imdbUrl: null, episodes: Array.from({ length: count }, (_, i) => episode(id, i + 1)) })) };
}
test('random stream is deterministic through serialization and station clock lookup; a new seed changes it', () => {
 const catalog = fixture(), before = JSON.stringify(catalog);
 const queue = buildSchedule(catalog), restored = buildSchedule(validateCatalog(JSON.parse(before)));
 assert.deepEqual(queue.map(e => e.episode.id), restored.map(e => e.episode.id));
 assert.equal(JSON.stringify(catalog), before);
 assert.deepEqual(schedulePosition(queue, 1000, 1053), schedulePosition(restored, 1000, 1053));
 catalog.settings.shuffleSeed = 43;
 assert.notDeepEqual(buildSchedule(catalog).map(e => e.episode.id), queue.map(e => e.episode.id));
});
test('random turns balance shows regardless of pool size and cover every episode without per-pool duplicates', () => {
 const queue = buildSchedule(fixture()); assert.equal(queue.length, 18);
 for (let start = 0; start < queue.length; start += 3) assert.deepEqual(new Set(queue.slice(start, start + 3).map(e => e.show.id)), new Set(['a', 'b', 'c']));
 assert.equal(new Set(queue.map(e => e.episode.id)).size, 11);
 assert.notEqual(queue[0].show.id, queue.at(-1).show.id);
 for (let index = 1; index < queue.length; index++) assert.notEqual(queue[index].show.id, queue[index - 1].show.id);
 for (const [id, count] of [['a', 6], ['b', 2], ['c', 3]]) {
  const sequence = queue.filter(e => e.show.id === id);
  for (let start = 0; start < sequence.length; start += count) assert.equal(new Set(sequence.slice(start, start + count).map(e => e.episode.id)).size, Math.min(count, sequence.length - start));
 }
});
test('genre and show-only random streams stay in scope and unknown/unchecked sources stay out', () => {
 const catalog = fixture(); catalog.settings.channel = 'cartoons';
 assert.ok(buildSchedule(catalog).every(entry => entry.show.channel === 'cartoons'));
 catalog.settings.streamShow = 'b';
 assert.deepEqual(new Set(buildSchedule(catalog).map(entry => entry.show.id)), new Set(['b']));
 catalog.shows[1].episodes[0].durationSeconds = null;
 catalog.shows[1].episodes[1].sources[0].availability = 'unverified';
 assert.deepEqual(buildSchedule(catalog), []);
});
test('random stream keeps multipart stories contiguous and places bumpers after a complete story', () => {
 const catalog = fixture(); catalog.shows[0].episodes[0].group = catalog.shows[0].episodes[1].group = 'two-part story';
 const bumper = { ...episode('bumper', 1), kind: 'bumper', durationSeconds: 2 }; catalog.shows[0].episodes.push(bumper); catalog.settings.bumpers = true;
 const queue = buildSchedule(catalog), first = queue.findIndex(e => e.episode.id === 'a-1');
 assert.equal(queue[first + 1].episode.id, 'a-2'); assert.equal(queue[first + 2].episode.kind, 'bumper');
 const start = { showId: queue[first].show.id, episodeId: queue[first].episode.id, queueMode: 'station', queuePosition: { index: first, previousId: queue[(first - 1 + queue.length) % queue.length].episode.id } };
 assert.equal(adjacentPlayback(catalog, start, 1).episode.id, 'a-2');
});
test('two-story turns preserve show batches and cap a tiny pool at one turn without immediate replay', () => {
 const catalog = fixture(); catalog.settings.storiesPerTurn = 2; catalog.shows[2].episodes = [episode('c', 1)];
 const queue = buildSchedule(catalog); let index = 0;
 while (index < queue.length) {
  const id = queue[index].show.id, count = id === 'c' ? 1 : 2;
  assert.equal(new Set(queue.slice(index, index + count).map(e => e.show.id)).size, 1);
  assert.equal(new Set(queue.slice(index, index + count).map(e => e.episode.id)).size, count);
  index += count;
 }
});
test('legacy catalogs default to random and all stream settings survive storage and validation', () => {
 const legacy = fixture(); legacy.settings = { channel: 'mixed', bumpers: false };
 const migrated = validateCatalog(legacy); assert.equal(migrated.settings.rotation, 'random'); assert.equal(migrated.settings.shuffleSeed, 1984);
 const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
 migrated.settings.streamShow = 'a'; migrated.settings.storiesPerTurn = 3; migrated.settings.shuffleSeed = 100;
 saveCatalog(storage, migrated); assert.deepEqual(readCatalog(storage, fixture()).catalog.settings, migrated.settings);
 for (const patch of [{ rotation: 'bogus' }, { shuffleSeed: -1 }, { shuffleSeed: 1.5 }, { streamShow: 'missing' }, { storiesPerTurn: 4 }, { channel: 'cartoons', streamShow: 'a' }]) assert.throws(() => validateCatalog({ ...migrated, settings: { ...migrated.settings, ...patch } }));
});

test('three-story turns do not repeat a story when a small pool reshuffles mid-turn', () => {
 for (let seed = 1; seed <= 20; seed++) {
  const catalog = fixture(); catalog.settings.shuffleSeed = seed; catalog.settings.storiesPerTurn = 3;
  catalog.shows[0].episodes = Array.from({ length: 7 }, (_, index) => episode('a', index + 1));
  catalog.shows[1].episodes = Array.from({ length: 4 }, (_, index) => episode('b', index + 1));
  catalog.shows[2].episodes = [episode('c', 1)];
  const queue = buildSchedule(catalog); let index = 0;
  while (index < queue.length) {
   const count = queue[index].show.id === 'c' ? 1 : 3;
   const turn = queue.slice(index, index + count);
   assert.equal(new Set(turn.map(entry => entry.episode.id)).size, count);
   index += count;
  }
 }
});

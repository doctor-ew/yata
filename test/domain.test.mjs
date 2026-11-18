import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/catalog.mjs';
import { parseSourceUrl, parseDuration, archiveEpisodes, importArchive, validateCatalog,
  parseCatalogJson, readCatalog, saveCatalog, STORAGE_KEY, buildSchedule, schedulePosition } from '../src/domain.mjs';

function episode(id, number, durationSeconds = 10, group = '') {
  return { id, number, season: 1, durationSeconds, group, kind: 'episode', title: id,
    sources: [{ id: `${id}-source`, provider: 'youtube', availability: 'verified', url: 'https://www.youtube.com/watch?v=RmycafPZFl8' }] };
}
function fixture() {
  return { version: 1, epoch: 1000, settings: { channel: 'mixed', bumpers: false, rotation: 'ordered', shuffleSeed: 1984, storiesPerTurn: 1, streamShow: null }, shows: [
    { id: 'a', title: 'A', channel: 'action', imdbUrl: null, episodes: [episode('a2', 2), episode('a1', 1)] },
    { id: 'b', title: 'B', channel: 'cartoons', imdbUrl: null, episodes: [episode('b1', 1), episode('b2', 2)] },
  ] };
}

test('starter catalog includes the original list, all extras and a separately labeled compilation', () => {
  const c = validateCatalog(createSeed());
  assert.equal(c.shows.length, 258);
  assert.equal(c.settings.bumpers, true);
  for (const title of ['Mighty Orbots', 'Street Hawk', 'The Phoenix', 'SilverHawks', 'V']) assert(c.shows.some(s => s.title === title));
  assert.equal(c.shows.find(s => s.id === 'saturday-simulator').episodes[0].sources[0].availability, 'unverified');
  assert.equal(buildSchedule(c).length, 1);
});
test('source parsers canonicalize safe supported URLs and retain video vs playlist distinctions', () => {
  assert.equal(parseSourceUrl('https://youtu.be/RmycafPZFl8?t=20').videoId, 'RmycafPZFl8');
  assert.equal(parseSourceUrl('https://www.youtube.com/playlist?list=PL1234567890').kind, 'playlist');
  assert.equal(parseSourceUrl('https://archive.org/metadata/item-one').url, 'https://archive.org/details/item-one');
  assert.equal(parseSourceUrl('https://tubitv.com/tv-shows/301812/s01-e01-the-cobra-strikes').provider, 'tubi');
});
test('rejects unsupported schemes, credential URLs, lookalike hosts, traversal and invalid video identifiers', () => {
  for (const url of ['javascript:alert(1)', 'file:///tmp/foo', 'http://archive.org/details/a', 'https://archive.org.evil.test/details/a',
    'https://user:pass@archive.org/details/a', 'https://archive.org:8443/details/a', 'https://youtu.be/nope',
    'https://archive.org/download/a/%2e%2e%2fevil.mp4', 'https://tubitv.com.evil.test/tv-shows/1/x']) {
    assert.throws(() => parseSourceUrl(url), undefined, url);
  }
});
test('runtimes remain unknown when missing or invalid', () => {
  assert.equal(parseDuration('49:14.67'), 2954.67);
  for (const v of [null, '', 0, -1, Infinity, 'unknown', 'x:20']) assert.equal(parseDuration(v), null);
});
test('Archive import chooses one compatible derivative per original, ignoring private and non-video files', () => {
  const files = [
    { name: 'Show S01E02.avi', source: 'original' },
    { name: 'Show S01E02.mp4', original: 'Show S01E02.avi', format: 'h.264', length: '50:00' },
    { name: 'Show S01E02_small.mp4', original: 'Show S01E02.avi', length: '3000' },
    { name: 'Show S01E03.mp4', length: '2954.67' },
    { name: 'private.mp4', private: 'true', length: '10' }, { name: 'poster.jpg' },
  ];
  const episodes = archiveEpisodes('my-item', { files, metadata: {} });
  assert.equal(episodes.length, 2);
  assert.equal(episodes[0].durationSeconds, 3000);
  assert.equal(episodes[0].number, 2);
  assert.match(episodes[0].sources[0].url, /Show%20S01E02.mp4$/);
  assert.throws(() => archiveEpisodes('x', { files: [], metadata: {} }), /No public MP4/);
  assert.throws(() => archiveEpisodes('x', {}), /incomplete/);
  assert.throws(() => archiveEpisodes('x', { files: [null], metadata: {} }), /malformed/);
});
test('Archive adapter calls only the derived metadata URL and reports upstream errors', async () => {
  let called;
  const fetcher = async (url, options) => { called = { url, options }; return { ok: true, json: async () => ({ metadata: {}, files: [{ name: 'a.mp4', length: '10' }] }) }; };
  assert.equal((await importArchive('https://archive.org/details/sample', fetcher)).length, 1);
  assert.equal(called.url, 'https://archive.org/metadata/sample');
  assert.equal(called.options.credentials, 'omit');
  await assert.rejects(importArchive('https://archive.org/details/sample', async () => ({ ok: false, status: 503 })), /503/);
  await assert.rejects(importArchive('https://archive.org/details/sample', async () => { const e = new Error(); e.name = 'AbortError'; throw e; }), /too long/);
});
test('Archive adapter aborts a hung dependency and returns control', async () => {
  const fetcher = (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => {
    const e = new Error(); e.name = 'AbortError'; reject(e);
  }));
  await assert.rejects(importArchive('https://archive.org/details/sample', fetcher, 5), /too long/);
});
test('round-robin schedule maintains each show order across channel selection', () => {
  assert.deepEqual(buildSchedule(fixture()).map(e => e.episode.id), ['a1', 'b1', 'a2', 'b2']);
  assert.deepEqual(buildSchedule(fixture(), 'action').map(e => e.episode.id), ['a1', 'a2']);
});
test('adjacent multipart groups stay together without reversing episode chronology', () => {
  const c = fixture();
  c.shows[0].episodes = [episode('part-1', 1, 10, 'story'), episode('part-2', 2, 10, 'story'), episode('a3', 3)];
  assert.deepEqual(buildSchedule(c).map(e => e.episode.id), ['part-1', 'part-2', 'b1', 'a3', 'b2']);
});
test('bumpers are opt-in, require supplied media and are inserted after groups', () => {
  const c = fixture();
  c.shows[0].episodes.push({ ...episode('bumper', 0, 5), kind: 'bumper' });
  assert(!buildSchedule(c).some(e => e.episode.id === 'bumper'));
  c.settings.bumpers = true;
  assert.deepEqual(buildSchedule(c).map(e => e.episode.id), ['a1', 'bumper', 'b1', 'bumper', 'a2', 'bumper', 'b2', 'bumper']);
});
test('live schedule excludes unknown durations, unchecked sources, Tubi and playlists', () => {
  const c = fixture();
  c.shows[0].episodes[0].durationSeconds = null;
  c.shows[0].episodes[1].sources[0].availability = 'unverified';
  c.shows[1].episodes[0].sources[0] = { id: 't', provider: 'tubi', availability: 'verified', url: 'https://tubitv.com/tv-shows/301812/s01-e01-the-cobra-strikes' };
  c.shows[1].episodes[1].sources[0].url = 'https://www.youtube.com/playlist?list=PL1234567890';
  assert.deepEqual(buildSchedule(c), []);
  assert.equal(schedulePosition([], 1000), null);
});
test('clock scheduling is deterministic at exact boundaries, wraparound and before epoch', () => {
  const schedule = buildSchedule(fixture());
  assert.equal(schedulePosition(schedule, 1000, 1000).current.episode.id, 'a1');
  assert.equal(schedulePosition(schedule, 1000, 1009.5).offset, 9.5);
  assert.equal(schedulePosition(schedule, 1000, 1010).current.episode.id, 'b1');
  assert.equal(schedulePosition(schedule, 1000, 1040).offset, 0);
  assert.equal(schedulePosition(schedule, 1000, 999).current.episode.id, 'b2');
  assert.equal(schedulePosition(schedule, 1000, NaN), null);
});
test('JSON import validates the complete catalog before callers replace persisted state', () => {
  const previous = JSON.stringify(fixture());
  const storage = { getItem: () => previous, setItem() { throw Error('must not write'); } };
  for (const mutate of [c => c.version = 2, c => c.shows.push(c.shows[0]), c => c.shows[0].episodes[0].durationSeconds = 0,
    c => c.shows[0].episodes[0].sources[0].url = 'javascript:alert(1)', c => c.shows[0].episodes[0].sources[0].provider = 'tubi',
    c => c.settings.bumpers = 'yes', c => c.shows[0].episodes[0].number = 1.5]) {
    const c = fixture(); mutate(c);
    assert.throws(() => parseCatalogJson(JSON.stringify(c)));
    assert.equal(storage.getItem(), previous);
  }
  assert.throws(() => parseCatalogJson('{'), /not valid JSON/);
  assert.throws(() => parseCatalogJson(' '.repeat(8_000_001)), /8 MB/);
});
test('catalog persistence round-trips and storage errors are not reported as saved', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  saveCatalog(storage, fixture());
  assert(values.has(STORAGE_KEY));
  assert.deepEqual(readCatalog(storage, createSeed()).catalog, validateCatalog(fixture()));
  assert.throws(() => saveCatalog({ setItem() { throw Error('quota'); } }, fixture()), /quota/);
  assert(readCatalog({ getItem() { throw Error('denied'); } }, createSeed()).error);
});

// Catalog growth must remain bounded while shared snapshots use the same limit.
test('catalog accepts the expanded Saturday Morning lineup and rejects excessive shows', () => {
  const c=createSeed();
  for(const id of ['jem','she-ra','rainbow-brite','care-bears','strawberry-shortcake','my-little-pony','grimm-fairy-tale-classics','grape-ape','shirt-tales','heathcliff','garfield-friends'])assert.equal(c.shows.find(s=>s.id===id)?.channel,'cartoons');
  while(c.shows.length<513)c.shows.push({id:'extra-'+c.shows.length,title:'Extra',channel:'cartoons',imdbUrl:null,episodes:[]});
  assert.throws(()=>validateCatalog(c),/1–512 shows/);
  c.shows.pop();assert.equal(validateCatalog(c).shows.length,512);
});

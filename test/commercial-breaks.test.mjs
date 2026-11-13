import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMERCIAL_SHOW_ID, buildSchedule, validateCatalog, bumperPool } from '../src/domain.mjs';
import { adjacentPlayback, playbackQueue } from '../src/transport.mjs';
const episode = (id, number, kind = 'episode') => ({id, title: id, season: 1, number, kind, durationSeconds: kind === 'bumper' ? 30 : 1200, group: '', sources: [{id: `source-${id}`, provider: 'archive', availability: 'verified', url: `https://archive.org/download/commercial-test/${id}.mp4`}]});
function fixture() {
 return {version: 1, epoch: 0, settings: {channel: 'action', bumpers: false, rotation: 'ordered', shuffleSeed: 99, storiesPerTurn: 1, streamShow: null}, shows: [
  {id:'heroes', title:'Heroes', channel:'action', episodes:Array.from({length: 9}, (_, i) => episode(`hero-${i + 1}`, i + 1))},
  {id:'cartoons', title:'Cartoons', channel:'cartoons', episodes:[episode('cartoon-1', 1), episode('cartoon-2', 2)]},
  {id:COMMERCIAL_SHOW_ID, title:'Vintage commercials', channel:'cartoons', episodes:[episode('ad-one', 1, 'bumper'), episode('ad-two', 2, 'bumper')]},
 ]};
}
const activeFrom = (entry, queueMode = 'show') => ({showId:entry.show.id, episodeId:entry.episode.id, queueMode, queuePosition:entry.queuePosition});

test('global commercial pool reaches action, cartoons, mixed and show-only streams only when opted in', () => {
 const catalog = fixture();
 for (const channel of ['action', 'cartoons', 'mixed']) {
  catalog.settings.channel = channel;
  assert.ok(buildSchedule(catalog).every(entry => entry.episode.kind === 'episode'));
  catalog.settings.bumpers = true;
  for (const rotation of ['ordered', 'random']) {
   catalog.settings.rotation = rotation;
   const schedule = buildSchedule(catalog);
   assert.ok(schedule.some(entry => entry.show.id === COMMERCIAL_SHOW_ID));
   assert.ok(schedule.filter(entry => entry.show.id === COMMERCIAL_SHOW_ID).every(entry => entry.episode.kind === 'bumper'));
   assert.equal(schedule.at(-1).episode.kind, 'bumper');
  }
  catalog.settings.bumpers = false;
 }
 catalog.settings.channel = 'action'; catalog.settings.streamShow = 'heroes'; catalog.settings.bumpers = true;
 assert.deepEqual(new Set(buildSchedule(catalog).map(entry => entry.show.id)), new Set(['heroes', COMMERCIAL_SHOW_ID]));
});

test('station breaks preserve multipart stories and deterministic rotation avoids consecutive ad repeats', () => {
 const catalog = fixture(); catalog.settings.bumpers = true;
 const [first, second] = catalog.shows[0].episodes; first.group = second.group = 'two-part-story';
 for (const rotation of ['ordered', 'random']) {
  catalog.settings.rotation = rotation;
  const queue = buildSchedule(catalog), start = queue.findIndex(entry => entry.episode.id === first.id);
  assert.equal(queue[start + 1].episode.id, second.id);
  assert.equal(queue[start + 2].episode.kind, 'bumper');
  assert.deepEqual(queue, buildSchedule(structuredClone(catalog)));
  const ads = queue.filter(entry => entry.episode.kind === 'bumper');
  for (let index = 1; index < ads.length; index++) assert.notEqual(ads[index].episode.id, ads[index - 1].episode.id);
 }
});

test('manual queues keep unchecked programs, complete multipart stories, and have no trailing commercial', () => {
 const catalog = fixture(), show = catalog.shows[0]; catalog.settings.bumpers = true;
 show.episodes[0].group = show.episodes[1].group = 'story';
 show.episodes[2].durationSeconds = null; show.episodes[2].sources[0].availability = 'unverified';
 const active = {showId:show.id, episodeId:show.episodes[0].id, queueMode:'show'};
 const queue = playbackQueue(catalog, active);
 assert.deepEqual(queue.slice(0, 2).map(entry => entry.episode.id), ['hero-1','hero-2']);
 assert.equal(queue[2].episode.kind, 'bumper');
 assert.equal(queue[3].episode.id, 'hero-3');
 assert.equal(queue.at(-1).episode.kind, 'episode');
 assert.equal(adjacentPlayback(catalog, {...active, episodeId:queue.at(-1).episode.id}, 1), null);
 const ads = queue.filter(entry => entry.episode.kind === 'bumper');
 for (let index = 1; index < ads.length; index++) assert.notEqual(ads[index].episode.id, ads[index - 1].episode.id);
 catalog.settings.bumpers = false;
 assert.equal(playbackQueue(catalog, active).length, show.episodes.length);
});

test('manual next and previous retain original show ownership while a global commercial is active', () => {
 const catalog = fixture(); catalog.settings.bumpers = true;
 const first = {showId:'heroes', episodeId:'hero-1', queueMode:'show'};
 const ad = adjacentPlayback(catalog, first, 1);
 assert.equal(ad.show.id, COMMERCIAL_SHOW_ID); assert.equal(ad.queuePosition.ownerShowId, 'heroes');
 const duringAd = activeFrom(ad);
 assert.equal(playbackQueue(catalog, duringAd).filter(entry => entry.episode.kind === 'episode').length, 9);
 assert.equal(adjacentPlayback(catalog, duringAd, 1).episode.id, 'hero-2');
 assert.equal(adjacentPlayback(catalog, duringAd, -1).episode.id, 'hero-1');
 let current = first; const seen = [];
 for (let index = 0; index < 16; index++) {
  const entry = adjacentPlayback(catalog, current, 1); assert.ok(entry); seen.push(entry.episode.id); current = activeFrom(entry);
 }
 assert.equal(seen.at(-1), 'hero-9'); assert.equal(adjacentPlayback(catalog, current, 1), null);
});

test('turning commercials off or deleting the current clip recovers the surrounding programs', () => {
 for (const queueMode of ['show','station']) {
  const catalog = fixture(); catalog.settings.bumpers = true;
  const ad = adjacentPlayback(catalog, {showId:'heroes',episodeId:'hero-1',queueMode}, 1);
  const active = activeFrom(ad, queueMode);
  catalog.settings.bumpers = false;
  assert.equal(adjacentPlayback(catalog, active, 1).episode.id, 'hero-2');
  assert.equal(adjacentPlayback(catalog, active, -1).episode.id, 'hero-1');
  catalog.settings.bumpers = true;
  catalog.shows.find(show => show.id === COMMERCIAL_SHOW_ID).episodes = [];
  assert.equal(adjacentPlayback(catalog, active, 1).episode.id, 'hero-2');
 }
});

test('local user bumpers stay available and unsafe or unknown global clips never enter breaks', () => {
 const catalog = fixture(), heroes = catalog.shows[0], cartoons = catalog.shows[1], commercials = catalog.shows[2];
 heroes.episodes.push(episode('local-hero', 20, 'bumper')); cartoons.episodes.push(episode('local-cartoon', 20, 'bumper'));
 const unknown = episode('unknown-ad', 20, 'bumper'); unknown.durationSeconds = null;
 const unchecked = episode('unchecked-ad', 21, 'bumper'); unchecked.sources[0].availability = 'unverified';
 commercials.episodes.push(unknown, unchecked);
 assert.deepEqual(new Set(bumperPool(catalog, [heroes]).map(entry => entry.episode.id)),new Set(['ad-one','ad-two','local-hero']));
 catalog.settings.bumpers = true;
 const queue = playbackQueue(catalog, {showId:'heroes',episodeId:'hero-1',queueMode:'show'});
 assert.ok(queue.some(entry => entry.episode.id === 'local-hero'));
 assert.ok(!queue.some(entry => ['unknown-ad','unchecked-ad','local-cartoon'].includes(entry.episode.id)));
});

test('reserved collection accepts bumper clips only and cannot be selected as a program stream', () => {
 const catalog = fixture(); validateCatalog(catalog);
 catalog.shows[2].episodes[0].kind = 'episode'; assert.throws(() => validateCatalog(catalog), /bumper clips only/);
 catalog.shows[2].episodes[0].kind = 'bumper'; catalog.settings.channel = 'cartoons'; catalog.settings.streamShow = COMMERCIAL_SHOW_ID;
 assert.throws(() => validateCatalog(catalog), /program show/);
});

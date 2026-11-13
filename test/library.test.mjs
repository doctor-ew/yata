import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSeed } from '../src/catalog.mjs';
import { discoveryRows, mergeLibraryBatch } from '../src/bulk.mjs';
import { parseCatalogJson, buildSchedule, saveCatalog, readCatalog } from '../src/domain.mjs';
const data = new URL('../data/', import.meta.url);
test('shipped library covers every requested show, fits storage and repeats without adding duplicates', async () => {
 const packs = await Promise.all(['action', 'cartoon', 'youtube'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
 assert.equal(packs[2].curated, true);
 const seed = createSeed(), rows = discoveryRows(seed, packs);
 const result = mergeLibraryBatch(seed, rows);
 const json = JSON.stringify(result.catalog), parsed = parseCatalogJson(json);
 assert.ok(parsed.shows.filter(show => show.id !== 'saturday-simulator').every(show => show.episodes.length > 0));
 const manifest = JSON.parse(await readFile(new URL('library-manifest.json', data), 'utf8'));
 assert.equal(parsed.shows.reduce((n, show) => n + show.episodes.length, 0), manifest.episodes);
 assert.equal(new Set(buildSchedule(parsed).map(entry => entry.episode.id)).size, manifest.ready);
 assert.ok(Buffer.byteLength(json) < 2_000_000);
 const again = mergeLibraryBatch(parsed, rows);
 assert.equal(again.added, 0); assert.equal(again.alternatives, 0);
 assert.equal(JSON.stringify(again.catalog), json);
 const stored = new Map(); const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
 saveCatalog(storage, parsed); assert.deepEqual(readCatalog(storage, seed).catalog, parsed);
 const portable = parseCatalogJson(await readFile(new URL('expanded-catalog.json', data), 'utf8'));
 assert.equal(portable.shows.reduce((n, show) => n + show.episodes.length, 0), manifest.episodes);
});


test('Marvel cartoon additions have distinct stories, exclude title cards and merge into older saved catalogs', async () => {
 const packs = await Promise.all(['action', 'cartoon', 'youtube'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
 const seed = createSeed();
 const oldCatalog = structuredClone(seed);
 oldCatalog.shows = oldCatalog.shows.filter(show => !['spider-friends', 'hulk-1982'].includes(show.id));
 oldCatalog.settings.channel = 'action';
 const base = structuredClone(oldCatalog);
 for (const show of seed.shows) if (!base.shows.some(existing => existing.id === show.id)) base.shows.push({...show, episodes: []});
 const installed = mergeLibraryBatch(base, discoveryRows(base, packs)).catalog;
 assert.equal(installed.settings.channel, 'action');
 const spiders = installed.shows.find(show => show.id === 'spider-friends');
 const hulk = installed.shows.find(show => show.id === 'hulk-1982');
 assert.equal(spiders.channel, 'cartoons'); assert.equal(hulk.channel, 'cartoons');
 assert.equal(spiders.episodes.length, 24); assert.equal(hulk.episodes.length, 13);
 assert.deepEqual([1, 2, 3].map(season => spiders.episodes.filter(episode => episode.season === season).length), [13, 3, 8]);
 assert.deepEqual(hulk.episodes.map(episode => episode.number), Array.from({length: 13}, (_, i) => i + 1));
 assert.ok([...spiders.episodes, ...hulk.episodes].every(episode => episode.durationSeconds >= 1000 && episode.durationSeconds <= 1900 && !/title card/i.test(episode.title)));
 assert.equal(installed.shows.find(show => show.id === 'fall-guy').episodes.length, 110);
 assert.equal(installed.shows.find(show => show.id === 'hulk').channel, 'action');
 assert.equal(new Set(spiders.episodes.map(episode => `${episode.season}:${episode.number}`)).size, 24);
});

test('Saturday Morning expansion preserves known gaps, source order and older libraries', async () => {
 const packs = await Promise.all(['action', 'cartoon', 'youtube'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
 const counts = {'bionic-six':65, jayce:65, 'pole-position':13, 'turbo-teen':12, bravestarr:19, 'defenders-earth':65, 'drak-pack':16, 'dragons-lair':13};
 const seed = createSeed();
 const old = structuredClone(seed); old.shows = old.shows.filter(show => !(show.id in counts)); old.settings.channel = 'cartoons';
 for (const show of seed.shows) if (!old.shows.some(existing => existing.id === show.id)) old.shows.push({...show, episodes: []});
 const rows = discoveryRows(old, packs), installed = mergeLibraryBatch(old, rows).catalog;
 for (const [id, count] of Object.entries(counts)) {
  const show = installed.shows.find(show => show.id === id);
  assert.equal(show.channel, 'cartoons'); assert.equal(show.episodes.length, count, id);
  assert.ok(show.episodes.every(episode => episode.durationSeconds >= 1000 && episode.durationSeconds <= 1900));
  assert.equal(new Set(show.episodes.flatMap(episode => episode.sources.map(source => source.url))).size, count);
 }
 const get = id => installed.shows.find(show => show.id === id).episodes;
 assert.deepEqual(get('pole-position').map(e => [e.season, e.number]), Array.from({length:13}, (_,i) => [1,i+1]));
 assert.deepEqual(get('turbo-teen').map(e => e.number), [1,2,3,4,5,6,7,8,9,10,11,13]);
 assert.deepEqual(get('turbo-teen').filter(e => /non-English audio/.test(e.title)).map(e => e.number), [1,2,3,4,5,11]);
 assert.deepEqual(get('drak-pack').map(e => e.number), Array.from({length:16}, (_,i) => i+1));
 assert.deepEqual([1,2].map(season => get('bionic-six').filter(e => e.season === season).length), [22,43]);
 assert.equal(get('dungeons-dragons').length,27);
 assert.equal(installed.settings.channel,'cartoons');
 assert.equal(mergeLibraryBatch(installed,rows).added,0);
 assert.ok(buildSchedule(installed,'cartoons').some(slot => slot.show.id === 'dragons-lair'));
});

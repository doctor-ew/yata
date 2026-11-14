import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSeed } from '../src/catalog.mjs';
import { discoveryRows, mergeLibraryBatch } from '../src/bulk.mjs';
import { parseCatalogJson, buildSchedule, saveCatalog, readCatalog } from '../src/domain.mjs';
const data = new URL('../data/', import.meta.url);
test('shipped library covers every requested show, fits storage and repeats without adding duplicates', async () => {
 const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
 assert.equal(packs[2].curated, true);
 const seed = createSeed(), rows = discoveryRows(seed, packs);
 const result = mergeLibraryBatch(seed, rows);
 const json = JSON.stringify(result.catalog), parsed = parseCatalogJson(json);
 assert.ok(parsed.shows.filter(show => !['saturday-simulator','barnaby-jones'].includes(show.id)).every(show => show.episodes.length > 0));
 const manifest = JSON.parse(await readFile(new URL('library-manifest.json', data), 'utf8'));
 assert.equal(parsed.shows.reduce((n, show) => n + show.episodes.length, 0), manifest.episodes);
 assert.equal(new Set(buildSchedule(parsed).filter(entry => entry.episode.kind === 'episode').map(entry => entry.episode.id)).size, manifest.ready);
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
 const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
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
 const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
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

test('Hanna-Barbera expansion preserves shorts, long programs and intact story bundles', async () => {
 const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data), 'utf8'))));
 const counts = {'galaxy-rangers':65, visionaries:13, 'space-ghost':20, herculoids:18, galtar:21, 'speed-buggy':16, 'captain-caveman':16, 'hong-kong-phooey':16, dynomutt:20, 'yogi-bear':68, birdman:20, 'jonny-quest':26, 'super-friends':16, flintstones:26, jetsons:24, 'wacky-races':17};
 const seed = createSeed(), old = structuredClone(seed);
 old.shows = old.shows.filter(show => !(show.id in counts)); old.settings.channel = 'cartoons';
 for (const show of seed.shows) if (!old.shows.some(existing => existing.id === show.id)) old.shows.push({...show,episodes:[]});
 const rows = discoveryRows(old,packs), installed = mergeLibraryBatch(old,rows).catalog;
 const get = id => installed.shows.find(show => show.id === id).episodes;
 const scheduled = new Set(buildSchedule(installed,'cartoons').map(slot => slot.episode.id));
 for (const [id,count] of Object.entries(counts)) {
  assert.equal(get(id).length,count,id);
  assert.ok(get(id).every(e => scheduled.has(e.id)),id);
  assert.equal(new Set(get(id).map(e => `${e.season}:${e.number}`)).size,count,id);
 }
 assert.ok(get('captain-caveman').every(e => e.durationSeconds >= 600 && e.durationSeconds <= 900));
 assert.equal(get('yogi-bear').filter(e => e.durationSeconds < 600).length,67);
 assert.ok(get('super-friends').every(e => e.durationSeconds >= 2500 && e.durationSeconds <= 2900));
 assert.ok(get('space-ghost').every(e => /three-story bundle/.test(e.title) && e.durationSeconds < 1900 && e.season > 0));
 assert.ok(get('herculoids').every(e => /two-story bundle/.test(e.title)));
 assert.ok(get('flintstones').every(e => e.season === 6));
 assert.deepEqual(get('jetsons').map(e => e.number),Array.from({length:24},(_,i) => i+1));
 assert.deepEqual([1,2].map(season => get('dynomutt').filter(e => e.season === season).length),[16,4]);
 assert.equal(mergeLibraryBatch(installed,rows).added,0);
 assert.equal(installed.settings.channel,'cartoons');
});

test('Cartoon Express deep cuts and fantasy adventure additions migrate with source limits intact', async () => {
 const packs = await Promise.all(['action','cartoon','youtube','commercials'].map(async name => JSON.parse(await readFile(new URL(`${name}-discovery.json`, data),'utf8'))));
 const cartoons = {'butch-cassidy':13,'clue-club':16,goober:15,wheelie:13,'funky-phantom':17,'inch-high':13};
 const action = {'wizards-warriors':8,'matthew-star':22,'misfits-science':16,otherworld:8,'whiz-kids':18};
 const counts = {...cartoons,...action}, seed=createSeed(), old=structuredClone(seed);
 old.shows=old.shows.filter(show => !(show.id in counts)); old.settings.channel='mixed';
 for(const show of seed.shows)if(!old.shows.some(existing => existing.id===show.id))old.shows.push({...show,episodes:[]});
 const rows=discoveryRows(old,packs), installed=mergeLibraryBatch(old,rows).catalog;
 const get=id=>installed.shows.find(show=>show.id===id);
 for(const [id,count] of Object.entries(counts)){
  const show=get(id);assert.equal(show.episodes.length,count,id);
  assert.equal(show.channel,id in cartoons?'cartoons':['matthew-star','misfits-science','otherworld'].includes(id)?'scifi':'action');
  assert.equal(new Set(show.episodes.map(e=>`${e.season}:${e.number}`)).size,count,id);
  const scheduled=new Set(buildSchedule(installed,show.channel).map(slot=>slot.episode.id));
  assert.ok(show.episodes.every(e=>scheduled.has(e.id)),id);
 }
 assert.deepEqual(get('goober').episodes.map(e=>e.number),[1,2,3,4,5,6,8,9,10,11,12,13,14,15,16]);
 assert.ok(get('wheelie').episodes.every(e=>/three-story bundle/.test(e.title)));
 assert.equal(get('misfits-science').episodes.filter(e=>e.durationSeconds>5000).length,1);
 assert.deepEqual(get('otherworld').episodes.map(e=>e.number),[1,2,3,4,5,6,7,8]);
 assert.ok(get('whiz-kids').episodes.every(e=>e.sources.every(s=>decodeURIComponent(new URL(s.url).pathname).includes('/EN - VHS - Whiz Kids (1 - 18)/Syndicated (1-18)/272p/'))));
 assert.deepEqual(get('whiz-kids').episodes.map(e=>e.number),Array.from({length:18},(_,i)=>i+1));
 assert.equal(mergeLibraryBatch(installed,rows).added,0);
 assert.equal(installed.settings.channel,'mixed');
});

test('gadget heroes keep combined pilots and external listings distinct from station episodes',async()=>{
 const packs=await Promise.all(['action','cartoon','youtube','commercials'].map(async name=>JSON.parse(await readFile(new URL(`${name}-discovery.json`,data),'utf8'))));
 const counts={'blue-thunder':11,'the-master':13,'gold-monkey':21,stingray:1,'matt-houston':1};
 const seed=createSeed(),old=structuredClone(seed);old.shows=old.shows.filter(s=>!(s.id in counts));old.settings.channel='action';
 for(const show of seed.shows)if(!old.shows.some(s=>s.id===show.id))old.shows.push({...show,episodes:[]});
 const rows=discoveryRows(old,packs),installed=mergeLibraryBatch(old,rows).catalog;
 const get=id=>installed.shows.find(s=>s.id===id).episodes;
 const scheduled=new Set(buildSchedule(installed,'action').map(slot=>slot.episode.id));
 for(const [id,count] of Object.entries(counts)){
  assert.equal(get(id).length,count,id);
  if(id!=='stingray')assert.ok(get(id).every(e=>scheduled.has(e.id)),id);
 }
 assert.deepEqual(get('gold-monkey').map(e=>e.number),[1,...Array.from({length:20},(_,i)=>i+3)]);
 assert.equal(get('gold-monkey').filter(e=>e.durationSeconds>5000).length,1);
 assert.deepEqual(get('matt-houston').map(e=>[e.season,e.number]),[[2,5]]);
 assert.equal(get('stingray')[0].sources[0].provider,'tubi');
 assert.equal(get('stingray')[0].durationSeconds,null);
 assert.equal(scheduled.has(get('stingray')[0].id),false);
 assert.equal(get('stingray')[0].sources[0].url,'https://tubitv.com/series/300013655/stingray');
 assert.equal(mergeLibraryBatch(installed,rows).added,0);
 assert.equal(installed.settings.channel,'action');
});

test('commercial starter pack installs additively while preserving the breaks preference',async()=>{
 const packs=await Promise.all(['action','cartoon','youtube','commercials'].map(async name=>JSON.parse(await readFile(new URL(`${name}-discovery.json`,data),'utf8'))));
 for(const enabled of [false,true]){
  const seed=createSeed(),old=structuredClone(seed);old.shows=old.shows.filter(show=>show.id!=='vintage-commercials');old.settings.bumpers=enabled;
  for(const show of seed.shows)if(!old.shows.some(existing=>existing.id===show.id))old.shows.push({...show,episodes:[]});
  const rows=discoveryRows(old,packs),installed=mergeLibraryBatch(old,rows).catalog;
  const clips=installed.shows.find(show=>show.id==='vintage-commercials').episodes;
  assert.equal(clips.length,14);assert.ok(clips.every(e=>e.kind==='bumper'&&e.durationSeconds>=15&&e.durationSeconds<=90));
  assert.equal(installed.settings.bumpers,enabled);
  assert.equal(mergeLibraryBatch(installed,rows).added,0);
  for(const channel of ['action','cartoons','mixed'])assert.equal(buildSchedule(installed,channel).some(slot=>slot.show.id==='vintage-commercials'),enabled);
 }
});

test('commercials default on for new catalogs while saved off remains off',()=>{
 const seed=createSeed();assert.equal(seed.settings.bumpers,true);
 const prior=structuredClone(seed);prior.settings.bumpers=false;
 const saved=new Map();const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
 saveCatalog(storage,prior);assert.equal(readCatalog(storage,createSeed()).catalog.settings.bumpers,false);
 const empty={getItem:()=>null};assert.equal(readCatalog(empty,createSeed()).catalog.settings.bumpers,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSeed,CHANNELS} from '../src/catalog.mjs';
import {EXPANDED_ERA_SHOWS} from '../src/expanded-era.mjs';
import {buildSchedule,bumperPool} from '../src/domain.mjs';
import {discoveryRows,extendLibraryCatalog,mergeLibraryBatch} from '../src/bulk.mjs';
const load=async()=>JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
test('expanded original-era programs use existing channels and retain source boundaries',async()=>{
 const c=await load();c.settings.bumpers=false;assert.equal(CHANNELS.length,7);
 for(const channel of new Set(EXPANDED_ERA_SHOWS.map(s=>s.channel))){const ids=new Set(buildSchedule(c,channel).map(e=>e.show.id));for(const s of EXPANDED_ERA_SHOWS.filter(s=>s.channel===channel)){assert.equal(c.shows.find(x=>x.id===s.id).channel,channel);assert.ok(ids.has(s.id),s.id);}}
 const get=id=>c.shows.find(s=>s.id===id).episodes;
 assert.equal(get('classic-doctor-who').length,70);assert.deepEqual([...new Set(get('classic-doctor-who').map(e=>e.season))],[7,8,12]);assert.ok(get('classic-doctor-who').every(e=>e.group));
 assert.equal(get('daria').length,65);assert.ok(get('red-dwarf').every(e=>e.season>=1&&e.season<=8));assert.ok(get('clone-high').every(e=>e.season===1));
 assert.ok(get('scarecrow-king').every(e=>e.durationSeconds>=2300&&e.durationSeconds<=3600));
 assert.ok(get('brisco-county').find(e=>e.number===1).durationSeconds>5000);
 for(const s of EXPANDED_ERA_SHOWS){const e=get(s.id);assert.equal(new Set(e.map(e=>`${e.season}:${e.number}`)).size,e.length,s.id);}
});
test('expanded pack extends an older personal catalog and imports idempotently',async()=>{
 const pack=JSON.parse(await readFile(new URL('../data/expanded-era-discovery.json',import.meta.url),'utf8'));
 const old=createSeed();old.shows=old.shows.filter(s=>!EXPANDED_ERA_SHOWS.some(x=>x.id===s.id));old.settings.bumpers=false;old.settings.shuffleSeed=17;
 const before=structuredClone(old),extended=extendLibraryCatalog(old,createSeed()),rows=discoveryRows(extended,[pack]),first=mergeLibraryBatch(extended,rows);
 assert.deepEqual(old,before);assert.deepEqual(first.catalog.settings,before.settings);
 for(const s of before.shows)for(const episode of s.episodes)assert.deepEqual(first.catalog.shows.find(x=>x.id===s.id).episodes.find(e=>e.id===episode.id),episode);
 assert.equal(first.catalog.shows.find(s=>s.id==='daria').episodes.length,65);
 const second=mergeLibraryBatch(first.catalog,rows);assert.equal(second.added,0);assert.equal(second.alternatives,0);assert.deepEqual(second.catalog,first.catalog);
});
test('new Nickelodeon comedy shows receive Nick break clips rather than Adult Swim clips',async()=>{
 const c=await load();for(const id of ['double-dare','out-control','salute-shorts','hey-dude','pete-pete']){const pool=bumperPool(c,c.shows.filter(s=>s.id===id));assert.ok(pool.some(e=>e.show.id==='nickelodeon-bumps'));assert.ok(!pool.some(e=>e.show.id==='adult-swim-bumps'));}
});

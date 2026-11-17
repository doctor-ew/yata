import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {VIEWER_REQUEST_SHOWS} from '../src/viewer-requests.mjs';
import {createSeed} from '../src/catalog.mjs';
import {discoveryRows,mergeLibraryBatch} from '../src/bulk.mjs';
import {buildSchedule,stationSource,MAX_CATALOG_SHOWS} from '../src/domain.mjs';

test('requested original shows have checked source evidence, bounded metadata and preserved ordering',async()=>{
 const pack=JSON.parse(await readFile(new URL('../data/viewer-requests-discovery.json',import.meta.url)));
 const seed=createSeed();assert.ok(seed.shows.length<=MAX_CATALOG_SHOWS);
 const result=mergeLibraryBatch(seed,discoveryRows(seed,[pack]));
 assert.equal(pack.shows.length,VIEWER_REQUEST_SHOWS.length);
 for(const def of VIEWER_REQUEST_SHOWS){
  const show=result.catalog.shows.find(s=>s.id===def.id),evidence=pack.shows.find(s=>s.showId===def.id);
  assert.equal(show.channel,def.channel);assert.ok(show.episodes.length>0);
  const numbered=show.episodes.filter(e=>e.season>0);assert.equal(new Set(numbered.map(e=>e.season+':'+e.number)).size,numbered.length);
  const checked=new Set(evidence.sourceChecks.filter(c=>c.verified&&[200,206].includes(c.status)).map(c=>c.url));
  for(const e of show.episodes){assert.ok(e.durationSeconds>=500);assert.ok(stationSource(e));for(const source of e.sources)assert.ok(checked.has(source.url));}
 }
 const gargoyles=result.catalog.shows.find(s=>s.id==='gargoyles');
 const entries=buildSchedule({...result.catalog,shows:[gargoyles],settings:{...result.catalog.settings,channel:'cartoons',bumpers:false}});
 assert.deepEqual(entries.slice(0,gargoyles.episodes.length).map(e=>[e.episode.season,e.episode.number]),gargoyles.episodes.map(e=>[e.season,e.number]));
 const turtles=result.catalog.shows.find(s=>s.id==='tmnt-1987');assert.deepEqual(turtles.episodes.map(e=>e.number),[1,2,3,4,5]);assert.ok(turtles.episodes.every(e=>e.season===1));
 for(const id of ['tiny-toons','rescue-rangers'])assert.ok(result.catalog.shows.find(s=>s.id===id).episodes.every(e=>e.season===0&&/collection|special|rebroadcast/i.test(e.title)));
 const again=mergeLibraryBatch(result.catalog,discoveryRows(result.catalog,[pack]));assert.equal(again.added,0);assert.equal(again.alternatives,0);
});

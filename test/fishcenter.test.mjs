import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSeed} from '../src/catalog.mjs';
import {buildSchedule} from '../src/domain.mjs';
import {buildFishCenterCatalog} from '../scripts/fishcenter-discovery.mjs';
const selection=JSON.parse(await readFile(new URL('../data/fishcenter-selections.json',import.meta.url),'utf8'));
const registry=JSON.parse(await readFile(new URL('../data/channel-registry.json',import.meta.url),'utf8'));
function base(){return {...createSeed(),channelRegistry:structuredClone(registry)};}

test('FishCenter is one small Comedy collection and preserves every prior record and channel',()=>{
 const before=base(),snapshot=structuredClone(before),next=buildFishCenterCatalog(before,selection),show=next.shows.at(-1);
 assert.deepEqual(before,snapshot);assert.equal(next.shows.length,before.shows.length+1);assert.deepEqual(next.shows.slice(0,-1),before.shows);assert.deepEqual(next.channelRegistry,before.channelRegistry);
 assert.equal(show.id,'fishcenter');assert.equal(show.channel,'comedy');assert.equal(show.episodes.length,12);assert(show.episodes.every(e=>e.season===0&&e.number===0&&e.durationSeconds>=900&&e.sources.length===1&&e.sources[0].provider==='archive'));assert.equal(new Set(show.episodes.map(e=>e.id)).size,12);
 for(const date of ['2015-05-11','2015-10-15','2016-08-15','2016-08-16'])assert(show.episodes.some(e=>e.id===`fishcenter-${date}`));
 assert.throws(()=>buildFishCenterCatalog(next,selection),/already exists/);
});

test('unreviewed files, short clips, duplicate dates and bulk imports are rejected',()=>{
 for(const mutate of [s=>s.recordings.push(structuredClone(s.recordings[0])),s=>s.recordings[1].date=s.recordings[0].date,s=>s.recordings[0].durationSeconds=33,s=>s.recordings[0].verification.mp4Header=false,s=>s.recordings[0].url='https://archive.org/download/unrelated/movie.mp4']){const changed=structuredClone(selection);mutate(changed);assert.throws(()=>buildFishCenterCatalog(base(),changed));}
});

test('a FishCenter collection receives balanced show turns instead of episode-count weighting',()=>{
 const next=buildFishCenterCatalog(base(),selection),fish=next.shows.at(-1),other={...next.shows[0],id:'comparison-show',episodes:Array.from({length:36},(_,i)=>({...fish.episodes[0],id:'comparison-'+i,title:'Comparison '+i}))};
 next.shows=[fish,other];next.settings={...next.settings,channel:'mixed',streamShow:null,bumpers:false,storiesPerTurn:1};const schedule=buildSchedule(next);
 const counts=Object.fromEntries(['fishcenter','comparison-show'].map(id=>[id,schedule.filter(e=>e.show.id===id).length]));assert.deepEqual(counts,{fishcenter:36,'comparison-show':36});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildSchedule} from '../src/domain.mjs';
test('Saturday adventure additions preserve half-hour programs, deduplicate derivatives and retain the Valley gap',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));c.settings.bumpers=false;
 const slots=Object.fromEntries(['mixed','cartoons','scifi','late-night'].map(id=>[id,new Set(buildSchedule(c,id).map(e=>e.show.id))]));
 for(const [id,count] of [['flash-gordon-1979',24],['return-planet-apes',13],['valley-dinosaurs',15]]){const s=c.shows.find(s=>s.id===id);assert.equal(s.channel,'cartoons');assert.equal(s.episodes.length,count);assert.equal(new Set(s.episodes.map(e=>`${e.season}:${e.number}`)).size,count);assert.ok(slots.mixed.has(id));assert.ok(slots.cartoons.has(id));assert.ok(!slots.scifi.has(id));assert.ok(!slots['late-night'].has(id));assert.ok(s.episodes.every(e=>e.durationSeconds>=1100&&e.durationSeconds<=1700));}
 const flash=c.shows.find(s=>s.id==='flash-gordon-1979');assert.deepEqual([1,2].map(n=>flash.episodes.filter(e=>e.season===n).length),[16,8]);
 const valley=c.shows.find(s=>s.id==='valley-dinosaurs');assert.deepEqual(valley.episodes.map(e=>e.number),Array.from({length:16},(_,i)=>i+1).filter(n=>n!==10));
});

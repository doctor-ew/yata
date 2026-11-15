import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildSchedule} from '../src/domain.mjs';
test('requested collections route independently and omit Venture production extras',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));c.settings.bumpers=false;
 const slots=Object.fromEntries(['mixed','cartoons','scifi','late-night'].map(id=>[id,new Set(buildSchedule(c,id).map(e=>e.show.id))]));
 for(const [id,channel,count] of [['star-wars-droids','cartoons',14],['star-wars-holiday-special','scifi',1],['sealab-2020','cartoons',13],['venture-bros','late-night',28]]){
  const show=c.shows.find(s=>s.id===id);assert.equal(show.episodes.length,count);assert.equal(show.channel,channel);assert.ok(slots[channel].has(id));assert.ok(slots.mixed.has(id));
  for(const other of ['cartoons','scifi','late-night'].filter(x=>x!==channel))assert.ok(!slots[other].has(id));
 }
 const d=c.shows.find(s=>s.id==='star-wars-droids');assert.equal(d.episodes.find(e=>/Great Heep/.test(e.title)).season,0);
 const v=c.shows.find(s=>s.id==='venture-bros');assert.deepEqual([0,1,2].map(n=>v.episodes.filter(e=>e.season===n).length),[2,13,13]);assert.ok(v.episodes.every(e=>e.sources.every(s=>!decodeURIComponent(s.url).includes('/Extras/'))));
 assert.equal(c.shows.find(s=>s.id==='sealab-2021').channel,'late-night');
});

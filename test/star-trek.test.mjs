import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{buildSchedule}from'../src/domain.mjs';import{CHANNELS}from'../src/channels.mjs';
test('live-action Trek stays in Sci-Fi and the original animated series stays in Saturday Morning',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 const live=['star-trek-tos','star-trek-tng','star-trek-ds9','star-trek-voyager','star-trek-enterprise'];
 assert.equal(CHANNELS.length,9);assert.ok(!CHANNELS.some(c=>c.id==='star-trek'));
 c.settings.bumpers=false;const sci=buildSchedule(c,'scifi'),kids=buildSchedule(c,'cartoons');
 for(const id of live){assert.equal(c.shows.find(s=>s.id===id).channel,'scifi');assert.ok(sci.some(e=>e.show.id===id));assert.ok(!kids.some(e=>e.show.id===id));}
 assert.equal(c.shows.find(s=>s.id==='star-trek-tas').channel,'cartoons');assert.ok(kids.some(e=>e.show.id==='star-trek-tas'));assert.ok(!sci.some(e=>e.show.id==='star-trek-tas'));
 const pilot=c.shows.find(s=>s.id==='star-trek-tng').episodes.find(e=>e.season===1&&e.number===1);assert.ok(pilot.durationSeconds>5000);
});

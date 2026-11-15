import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{bumperPool,buildSchedule}from'../src/domain.mjs';
test('network bumps are short break clips, scoped to their channels, and respect the breaks toggle',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 const late=c.shows.filter(s=>s.channel==='late-night'),kids=c.shows.filter(s=>s.channel==='cartoons');
 const latePool=bumperPool(c,late),kidsPool=bumperPool(c,kids);
 assert.ok(latePool.some(e=>e.show.id==='adult-swim-bumps'));assert.ok(!latePool.some(e=>e.show.id==='nickelodeon-bumps'));
 assert.ok(kidsPool.some(e=>e.show.id==='nickelodeon-bumps'));assert.ok(!kidsPool.some(e=>e.show.id==='adult-swim-bumps'));
 assert.ok(bumperPool(c,c.shows.filter(s=>s.id==='ycdtotv')).some(e=>e.show.id==='nickelodeon-bumps'));
 for(const id of['adult-swim-bumps','nickelodeon-bumps'])assert.ok(c.shows.find(s=>s.id===id).episodes.every(e=>e.kind==='bumper'&&e.durationSeconds<=60));
 c.settings.bumpers=false;assert.ok(buildSchedule(c,'late-night').every(e=>e.episode.kind==='episode'));
 c.settings.bumpers=true;assert.ok(buildSchedule(c,'late-night').some(e=>e.show.id==='adult-swim-bumps'));
});

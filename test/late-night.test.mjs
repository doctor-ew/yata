import test from 'node:test';import assert from 'node:assert/strict';import {readFile}from'node:fs/promises';
import {parseSourceUrl,buildSchedule,stationSource}from'../src/domain.mjs';import{CHANNELS}from'../src/channels.mjs';
test('Late Night is both a separate channel and part of the main shuffle; official external pages never enter playback',async()=>{
 const c=JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 assert.equal(CHANNELS.find(c=>c.id==='late-night').number,'07');
 const schedule=buildSchedule(c,'late-night');assert.ok(schedule.length>300);assert.ok(schedule.filter(e=>e.episode.kind==='episode').every(e=>e.show.channel==='late-night'));
 const mixed=buildSchedule(c,'mixed');assert.ok(mixed.some(e=>e.show.channel==='late-night'));assert.ok(mixed.some(e=>e.show.channel==='cartoons'));
 for(const id of ['robot-chicken','squidbillies'])assert.equal(stationSource(c.shows.find(s=>s.id===id).episodes[0]),null);
 assert.ok(!schedule.some(e=>['robot-chicken','squidbillies'].includes(e.show.id)));
 const athf=c.shows.find(s=>s.id==='athf');assert.ok(athf.episodes.every(e=>e.season>=1&&e.season<=5));
});
test('official external links are restricted to Adult Swim episode pages',()=>{
 assert.equal(parseSourceUrl('https://www.adultswim.com/videos/robot-chicken/junk-in-the-trunk').kind,'external');
 for(const url of ['https://adultswim.com.bad.invalid/videos/robot-chicken/junk-in-the-trunk','https://www.adultswim.com/account','https://www.adultswim.com/videos/robot-chicken'])assert.throws(()=>parseSourceUrl(url));
});

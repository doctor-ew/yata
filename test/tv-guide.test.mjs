import test from 'node:test';import assert from 'node:assert/strict';
import {compileGuide,guideWindow,guidePlayback} from '../src/tv-guide.mjs';
import {buildSchedule,schedulePosition} from '../src/domain.mjs';
import {CHANNELS} from '../src/channels.mjs';
const episode=(id,duration=1200,kind='episode')=>({id,title:id,season:1,number:1,durationSeconds:duration,group:'',kind,sources:[{id:id+'-src',provider:'archive',availability:'verified',url:`https://archive.org/download/guide-fixture/${id}.mp4`}]});
function fixture(){return {version:1,epoch:1000,settings:{channel:'action',streamShow:'hero',rotation:'random',shuffleSeed:1984,storiesPerTurn:1,bumpers:true,commercialCount:2},shows:[{id:'hero',title:'Hero',channel:'action',episodes:[episode('hero-a'),episode('hero-b',1800)]},{id:'toon',title:'Toon',channel:'cartoons',episodes:[episode('toon-a',600)]},{id:'midnight-matinee',title:'Films',channel:'scifi',episodes:[episode('movie',5400)]},{id:'vintage-commercials',title:'Commercials',channel:'cartoons',episodes:[episode('ad',30,'bumper'),episode('ad-two',30,'bumper')]}]};}
test('Guide compiles full channels without mutating a tuned show or including feature films',()=>{
 const c=fixture(),before=JSON.stringify(c),rows=compileGuide(c);assert.equal(JSON.stringify(c),before);
 assert.deepEqual(rows.map(r=>r.channel.id),CHANNELS.map(c=>c.id));
 assert(rows.find(r=>r.channel.id==='cartoons').schedule.some(e=>e.show.id==='toon'));
 assert(rows.every(r=>r.schedule.every(e=>e.show.id!=='midnight-matinee')));
 assert.equal(rows.find(r=>r.channel.id==='comedy').schedule.length,0);
});
test('Each visible slot matches station playback at its actual time across cycles and negative epoch offsets',()=>{
 const c=fixture(),rows=compileGuide(c);
 for(const row of rows)for(const start of[-125,1000,4081.25,99999]){
  const result=guideWindow(row,c.epoch,start,start+7200);
  if(!row.schedule.length){assert.equal(result.slots.length,0);continue;}
  assert.equal(result.truncated,false);assert.equal(result.slots[0].visibleStart,start);assert.equal(result.slots.at(-1).visibleEnd,start+7200);
  for(const slot of result.slots){const p=schedulePosition(row.schedule,c.epoch,slot.visibleStart+.001);assert.equal(p.current.episode.kind,slot.entry.episode.kind);if(!slot.breakCount)assert.equal(p.current.episode.id,slot.entry.episode.id);assert.ok(slot.visibleEnd>slot.visibleStart);}
 }
});
test('Commercial grouping preserves repeated break occurrence for playback and does not shift programs',()=>{
 const c=fixture(),row=compileGuide(c).find(r=>r.channel.id==='action');const slots=guideWindow(row,c.epoch,c.epoch,c.epoch+7500).slots;
 const breaks=slots.filter(s=>s.breakCount);assert.ok(breaks.length>1);assert.equal(breaks[0].breakCount,2);assert.equal(breaks[0].end-breaks[0].start,60);
 const clipped=guideWindow(row,c.epoch,breaks[0].start+45,breaks[0].end+100).slots[0];assert.equal(clipped.index,breaks[0].index);assert.equal(clipped.breakCount,2);assert.equal(clipped.start,breaks[0].start);
 const playback=guidePlayback(c,breaks[1]);assert.equal(playback.index,breaks[1].index);assert.equal(playback.schedule[playback.index].episode.kind,'bumper');
});
test('Guide playback uses checked current sources and stale removed selections cannot start',()=>{
 const c=fixture(),row=compileGuide(c).find(r=>r.channel.id==='action'),slot=guideWindow(row,c.epoch,c.epoch,c.epoch+2000).slots[0];
 assert.equal(guidePlayback(c,slot).source.url,slot.entry.source.url);
 c.shows.find(s=>s.id==='hero').episodes=[];assert.equal(guidePlayback(c,slot),null);
});
test('Short-item windows are bounded and malformed windows rejected',()=>{
 const row={channel:CHANNELS[0],schedule:[{duration:.01,show:{id:'s'},episode:{id:'tiny',kind:'episode'},source:{}}]};
 const window=guideWindow(row,0,0,7200,20);assert.equal(window.slots.length,20);assert.equal(window.truncated,true);
 assert.throws(()=>guideWindow(row,0,5,4),RangeError);
});

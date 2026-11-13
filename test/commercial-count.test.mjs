import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, buildSchedule, COMMERCIAL_SHOW_ID, saveCatalog, readCatalog } from '../src/domain.mjs';
import { playbackQueue, adjacentPlayback, playbackPosition } from '../src/transport.mjs';
import { createCommercialBreak } from '../src/shuffle.mjs';
const episode = (id, number, kind = 'episode') => ({id, title:id, season:1, number, kind, group:'', durationSeconds:kind==='bumper'?30:1200,sources:[{id:`src-${id}`,provider:'archive',availability:'verified',url:`https://archive.org/download/count-test/${id}.mp4`}]});
function fixture(poolSize=5) {
 const programs=Array.from({length:12},(_,i)=>episode(`program-${i+1}`,i+1)); programs[0].group=programs[1].group='multipart';
 return {version:1,epoch:0,settings:{channel:'action',bumpers:true,rotation:'ordered',shuffleSeed:99,storiesPerTurn:1,streamShow:null,commercialCount:3},shows:[
  {id:'programs',title:'Programs',channel:'action',episodes:programs},
  {id:COMMERCIAL_SHOW_ID,title:'Commercials',channel:'cartoons',episodes:Array.from({length:poolSize},(_,i)=>episode(`ad-${i+1}`,i+1,'bumper'))},
 ]};
}
const blocks = queue => {
 const result=[]; let block=[];
 for(const entry of queue){if(entry.episode.kind==='bumper')block.push(entry);else if(block.length){result.push(block);block=[];}}
 if(block.length)result.push(block);return result;
};
const activeFrom=(entry,queueMode)=>({showId:entry.show.id,episodeId:entry.episode.id,queueMode,queuePosition:entry.queuePosition});

test('commercial count settings validate, preserve legacy one-clip behavior and round-trip storage',()=>{
 const legacy=fixture();delete legacy.settings.commercialCount;assert.equal(validateCatalog(legacy).settings.commercialCount,1);
 const stored=new Map(), storage={getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value)};
 for(const count of[1,2,3,'random']){const c=fixture();c.settings.commercialCount=count;saveCatalog(storage,c);assert.equal(readCatalog(storage,legacy).catalog.settings.commercialCount,count);}
 for(const value of[0,4,-1,1.5,'2','all',true]){const c=fixture();c.settings.commercialCount=value;assert.throws(()=>validateCatalog(c),/commercials per break/);}
});

test('fixed and random breaks work in ordered, shuffled and manual queues without splitting stories',()=>{
 for(const rotation of['ordered','random'])for(const count of[1,2,3,'random']){
  const c=fixture();c.settings.rotation=rotation;c.settings.commercialCount=count;
  const station=buildSchedule(c), manual=playbackQueue(c,{showId:'programs',episodeId:'program-1',queueMode:'show'});
  for(const queue of[station,manual]){
   const breaks=blocks(queue);assert.ok(breaks.length>1);
   assert.ok(breaks.every(block=>count==='random'?block.length>=1&&block.length<=3:block.length===count));
   assert.ok(breaks.every(block=>new Set(block.map(entry=>entry.episode.id)).size===block.length));
   const ads=queue.filter(entry=>entry.episode.kind==='bumper');for(let i=1;i<ads.length;i++)assert.notEqual(ads[i].episode.id,ads[i-1].episode.id);
   const first=queue.findIndex(entry=>entry.episode.id==='program-1');assert.equal(queue[first+1].episode.id,'program-2');assert.equal(queue[first+2].episode.kind,'bumper');
  }
  assert.equal(manual.at(-1).episode.kind,'episode');assert.equal(station.at(-1).episode.kind,'bumper');
  assert.deepEqual(station,buildSchedule(structuredClone(c)));assert.deepEqual(manual,playbackQueue(structuredClone(c),{showId:'programs',episodeId:'program-1',queueMode:'show'}));
  if(count==='random')assert.ok(new Set(blocks(station).map(block=>block.length)).size>1);
 }
});

test('a short commercial pool caps each break instead of replaying a clip inside the break',()=>{
 for(const size of[0,1,2])for(const count of[1,2,3,'random']){
  const c=fixture(size);c.settings.commercialCount=count;
  for(const queue of[buildSchedule(c),playbackQueue(c,{showId:'programs',episodeId:'program-1',queueMode:'show'})]){
   assert.ok(blocks(queue).every(block=>block.length<=size&&new Set(block.map(entry=>entry.episode.id)).size===block.length));
   if(!size)assert.equal(blocks(queue).length,0);
   else if(count!=='random')assert.ok(blocks(queue).every(block=>block.length===Math.min(size,count)));
  }
 }
});

test('break selection stays deterministic and unique through repeated small-pool refills',()=>{
 for(let seed=1;seed<=30;seed++)for(const size of[1,2,3,4]){
  const c=fixture(size),entries=c.shows[1].episodes.map(episode=>({episode}));
  const one=createCommercialBreak(entries,{seed,scope:'refills',commercialCount:'random'}),two=createCommercialBreak(entries,{seed,scope:'refills',commercialCount:'random'});let last=null;
  for(let index=0;index<30;index++){
   const batch=one(),again=two();assert.deepEqual(batch,again);assert.equal(new Set(batch).size,batch.length);
   for(const entry of batch){if(size>1)assert.notEqual(entry,last);last=entry;}
  }
 }
});

test('manual multi-commercial navigation preserves owner and program anchors for every clip',()=>{
 const c=fixture(),first={showId:'programs',episodeId:'program-2',queueMode:'show'};
 let active=first;const ads=[];
 for(let i=0;i<3;i++){
  const next=adjacentPlayback(c,active,1);assert.equal(next.episode.kind,'bumper');ads.push(next);
  assert.equal(next.queuePosition.ownerShowId,'programs');assert.equal(next.queuePosition.previousProgramId,'program-2');assert.equal(next.queuePosition.nextProgramId,'program-3');active=activeFrom(next,'show');
 }
 assert.equal(adjacentPlayback(c,active,1).episode.id,'program-3');
 assert.equal(adjacentPlayback(c,active,-1).episode.id,ads[1].episode.id);
 assert.equal(adjacentPlayback(c,activeFrom(ads[0],'show'),-1).episode.id,'program-2');
});

test('disabling breaks or removing active middle clips recovers program neighbors, never another ad',()=>{
 for(const queueMode of['show','station'])for(const change of['off','remove-current','remove-pool']){
  const c=fixture(),queue=queueMode==='station'?buildSchedule(c):playbackQueue(c,{showId:'programs',episodeId:'program-1',queueMode});
  const start=queue.findIndex(entry=>entry.episode.kind==='bumper'),index=start+1,entry=queue[index];
  assert.equal(entry.episode.kind,'bumper');
  const active={showId:entry.show.id,episodeId:entry.episode.id,queueMode,queuePosition:playbackPosition(queue,index,queueMode==='show'?'programs':null)};
  if(change==='off')c.settings.bumpers=false;
  else c.shows[1].episodes=change==='remove-pool'?[]:c.shows[1].episodes.filter(episode=>episode.id!==entry.episode.id);
  assert.equal(adjacentPlayback(c,active,1).episode.id,'program-3',`${queueMode}/${change}`);
  assert.equal(adjacentPlayback(c,active,-1).episode.id,'program-2',`${queueMode}/${change}`);
 }
});


test('recovery skips remaining ads if one neighboring program was also removed',()=>{
 const c=fixture(),queue=playbackQueue(c,{showId:'programs',episodeId:'program-1',queueMode:'show'}),index=3,entry=queue[index];
 assert.equal(entry.episode.kind,'bumper');
 const active={showId:entry.show.id,episodeId:entry.episode.id,queueMode:'show',queuePosition:playbackPosition(queue,index,'programs')};
 c.shows[1].episodes=c.shows[1].episodes.filter(episode=>episode.id!==entry.episode.id);
 c.shows[0].episodes=c.shows[0].episodes.filter(episode=>episode.id!=='program-3');
 assert.equal(adjacentPlayback(c,active,1).episode.id,'program-4');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { availableDialShows, nextDialShow, randomDialPatch } from '../src/dials.mjs';
import { COMMERCIAL_SHOW_ID } from '../src/domain.mjs';
const episode = (id, patch = {}) => ({id, title:id, kind:'episode', durationSeconds:1200, sources:[{provider:'archive',availability:'verified',url:`https://archive.org/download/dial-test/${id}.mp4`}],...patch});
function fixture() {
 const show=(id,channel,episodes=[episode(id)])=>({id,title:id,channel,episodes});
 return {settings:{channel:'action',rotation:'ordered',streamShow:'hero-two',shuffleSeed:4,bumpers:false,commercialCount:3,storiesPerTurn:2},shows:[
  show('hero-one','action'),show('toon-one','cartoons'),show('hero-two','action'),show('hero-three','action'),
  show('tubi-only','action',[episode('tubi',{sources:[{provider:'tubi',availability:'verified',url:'https://tubitv.com/series/4067/stingray'}]})]),
  show('unchecked','action',[episode('unchecked',{sources:[{provider:'youtube',availability:'unverified',url:'https://www.youtube.com/watch?v=M7lc1UVf-VE'}]})]),
  show('unknown-duration','action',[episode('unknown',{durationSeconds:null})]),
  show('bumper-only','action',[episode('local-bumper',{kind:'bumper'})]),
  show(COMMERCIAL_SHOW_ID,'cartoons',[episode('ad',{kind:'bumper'})]),
 ]};
}

test('dial availability filters by checked programs and channel without restricting to the selected show',()=>{
 const catalog=fixture(),before=JSON.stringify(catalog);
 assert.deepEqual(availableDialShows(catalog).map(show=>show.id),['hero-one','hero-two','hero-three']);
 assert.deepEqual(availableDialShows(catalog,'cartoons').map(show=>show.id),['toon-one']);
 assert.deepEqual(availableDialShows(catalog,'mixed').map(show=>show.id),['hero-one','toon-one','hero-two','hero-three']);
 assert.equal(availableDialShows(catalog)[0],catalog.shows[0]);assert.equal(JSON.stringify(catalog),before);
 for(const durationSeconds of[0,-1,NaN,Infinity]){const c=fixture();c.shows[0].episodes[0].durationSeconds=durationSeconds;assert.ok(!availableDialShows(c).some(show=>show.id==='hero-one'));}
});

test('upper dial follows catalog order, wraps, starts at the first eligible show and handles empty channels',()=>{
 const c=fixture();assert.equal(nextDialShow(c,'hero-one').id,'hero-two');assert.equal(nextDialShow(c,'hero-three').id,'hero-one');
 assert.equal(nextDialShow(c,'missing').id,'hero-one');assert.equal(nextDialShow(c,'tubi-only').id,'hero-one');
 c.settings.channel='cartoons';assert.equal(nextDialShow(c,'toon-one').id,'toon-one');
 c.shows=c.shows.filter(show=>show.channel!=='cartoons');assert.equal(nextDialShow(c,'toon-one'),null);
});

test('channel and all dial modes return minimal shuffle patches and preserve other preferences',()=>{
 const c=fixture(),before=JSON.stringify(c);
 assert.deepEqual(randomDialPatch(c,{seed:99}),{channel:'action',streamShow:null,rotation:'random',shuffleSeed:99});
 assert.deepEqual(randomDialPatch(c,{mode:'all',seed:4294967295}),{channel:'mixed',streamShow:null,rotation:'random',shuffleSeed:4294967295});
 const applied={...c.settings,...randomDialPatch(c,{seed:0})};assert.equal(applied.bumpers,false);assert.equal(applied.commercialCount,3);assert.equal(applied.storiesPerTurn,2);
 assert.equal(JSON.stringify(c),before);
});

test('random show dial stays in scope, avoids the current show and supports a single-show pool',()=>{
 const c=fixture();
 assert.equal(randomDialPatch(c,{mode:'show',seed:8,random:()=>0,currentShowId:'hero-one'}).streamShow,'hero-two');
 assert.equal(randomDialPatch(c,{mode:'show',seed:8,random:()=>.999,currentShowId:'hero-two'}).streamShow,'hero-three');
 assert.ok(!['toon-one','tubi-only','unchecked',COMMERCIAL_SHOW_ID].includes(randomDialPatch(c,{mode:'show',seed:8,random:()=>.5}).streamShow));
 c.settings.channel='cartoons';assert.deepEqual(randomDialPatch(c,{mode:'show',seed:9,random:()=>.9,currentShowId:'toon-one'}),{channel:'cartoons',streamShow:'toon-one',rotation:'random',shuffleSeed:9});
});

test('empty dial scopes return null while all mode can reach another channel',()=>{
 const c=fixture();c.shows=c.shows.filter(show=>show.channel==='cartoons');
 assert.equal(randomDialPatch(c,{seed:1}),null);assert.equal(randomDialPatch(c,{mode:'show',seed:1}),null);
 assert.equal(randomDialPatch(c,{mode:'all',seed:1}).channel,'mixed');
 c.shows=[];assert.equal(randomDialPatch(c,{mode:'all',seed:1}),null);
});

test('dial random samples are bounded and invalid shuffle seeds are rejected',()=>{
 const c=fixture();
 for(const value of[-20,NaN,Infinity,undefined,'1'])assert.equal(randomDialPatch(c,{mode:'show',seed:1,random:()=>value}).streamShow,'hero-one');
 for(const value of[1,2,900])assert.equal(randomDialPatch(c,{mode:'show',seed:1,random:()=>value}).streamShow,'hero-three');
 for(const seed of[undefined,-1,4294967296,1.5,NaN,Infinity,'2'])assert.throws(()=>randomDialPatch(c,{seed}),/32-bit unsigned integer/);
 assert.throws(()=>randomDialPatch(c,{mode:'bogus',seed:1}),/dial mode/);
});

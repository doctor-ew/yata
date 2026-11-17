import test from 'node:test';
import assert from 'node:assert/strict';
import {BUDDY_PERSONAS} from '../src/buddy-personas.mjs';
import {BUDDY_QUIPS,buddyHoverMessages,createBuddyHoverRotation} from '../src/buddy-quips.mjs';
test('every registered companion has multiple short original static asides',()=>{
 assert.deepEqual(Object.keys(BUDDY_QUIPS).sort(),BUDDY_PERSONAS.map(p=>p.id).sort());
 for(const persona of BUDDY_PERSONAS){const pool=buddyHoverMessages(persona);assert.ok(pool.length>=3,persona.id);assert.equal(new Set(pool).size,pool.length);for(const text of pool)assert.ok(text.length<=240,persona.id);}
});
test('fresh entries rotate without immediate repeats even with deterministic randomness',()=>{
 const rotation=createBuddyHoverRotation({random:()=>0}),persona=BUDDY_PERSONAS.find(p=>p.id==='orko');let previousText=persona.greeting;
 for(let i=0;i<12;i++){const text=rotation.next({persona,previousText});assert.notEqual(text,previousText);previousText=text;}
 const other=BUDDY_PERSONAS.find(p=>p.id==='velma');rotation.next({persona:other});assert.notEqual(rotation.next({persona}),previousText);
});
test('context remarks contain only supplied bounded titles and unknown personas have a varied fallback',()=>{
 const pool=buddyHoverMessages({id:'unknown',greeting:'Hello there.'},{showTitle:'Taxi',episodeTitle:'A Title',nextShowTitle:'Benson',plot:'invented private plot',nextEpisodeTitle:'x'.repeat(1000)});
 assert.ok(pool.some(text=>text==='On your screen: Taxi · A Title.'));assert.ok(pool.some(text=>text.startsWith('In the lineup next: Benson')));assert.ok(!pool.join(' ').includes('invented private plot'));assert.ok(pool.every(text=>text.length<=240));
 const rotation=createBuddyHoverRotation({random:()=>Infinity});assert.notEqual(rotation.next({}),rotation.next({}));
});

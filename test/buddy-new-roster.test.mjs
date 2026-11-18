import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {validateBuddyFeed,applyBuddyFeed,bundledBuddyFeed} from '../src/buddy-registry.mjs';
import {BUDDY_PERSONAS} from '../src/buddy-personas.mjs';
import {buddyCommand} from '../src/buddy-intents.mjs';
test('downloaded original-era companions resolve names without changing the bundled roster',()=>{
 const feed=validateBuddyFeed(JSON.parse(readFileSync(new URL('../data/buddy-personas.json',import.meta.url),'utf8')));
 for(const id of ['junior','brainy','drebin','lesnessman']){
  const profile=feed.personas.find(p=>p.id===id);assert.ok(profile);assert.ok(existsSync(new URL('../'+profile.image,import.meta.url)));assert.ok(profile.quips.length>=2);
  assert.ok(!bundledBuddyFeed().personas.some(p=>p.id===id));
 }
 try{applyBuddyFeed(feed);for(const [alias,id] of [['Nessman','lesnessman'],['Wetworth','junior'],['Brainy','brainy'],['Detective Drebbin','drebin']])assert.deepEqual(buddyCommand('turn into '+alias,BUDDY_PERSONAS),{action:'select',id});}
 finally{applyBuddyFeed(bundledBuddyFeed());}
});

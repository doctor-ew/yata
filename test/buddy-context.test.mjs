import test from 'node:test';
import assert from 'node:assert/strict';
import {buddyNavigation,playbackContext,companionNote,createCompanionNotePolicy} from '../src/buddy-context.mjs';
test('playback context retains only bounded title strings and drops arbitrary metadata',()=>{
 assert.deepEqual(playbackContext({showTitle:' Taxi\n',episodeTitle:'x'.repeat(400),nextShowTitle:2,secret:'private'}),{showTitle:'Taxi',episodeTitle:'x'.repeat(180),nextShowTitle:'',nextEpisodeTitle:''});
 assert.deepEqual(playbackContext(null),{showTitle:'',episodeTitle:'',nextShowTitle:'',nextEpisodeTitle:''});
});
test('context notes repeat supplied titles without inventing plot or invoking AI',()=>{
 const context={showTitle:'Taxi',episodeTitle:'Episode A',nextShowTitle:'Street Hawk',nextEpisodeTitle:'Episode B'};
 assert.match(companionNote(context),/^On now: Taxi · Episode A\./);
 assert.match(companionNote(context,{variant:1}),/^Up next: Street Hawk · Episode B\./);
 assert.match(companionNote(context,{variant:2,suggestionTitle:'Benson'}),/checked library: Benson/);
 assert.equal(companionNote({}), '');
 assert.notEqual(companionNote(context,{variant:3,personaId:'arnold'}),companionNote(context,{variant:3,personaId:'benson'}));
});
test('occasional notes respect initial delay, cooldown, hidden state and opt-out',()=>{
 let time=0;const notes=createCompanionNotePolicy({now:()=>time}),context={showTitle:'Taxi'};
 assert.equal(notes.next({context}), '');time=45000;
 for(const conditions of [{enabled:false},{visible:false},{panelOpen:true}])assert.equal(notes.next({context,...conditions}),'');
 assert.match(notes.next({context}),/^On now/);assert.equal(notes.next({context}),'');
 time+=299999;assert.equal(notes.next({context}),'');time++;assert.match(notes.next({context}),/^On now/);
 time+=200000;notes.dismiss();time+=299999;assert.equal(notes.next({context}),'');time++;assert.ok(notes.next({context}));
});

test('navigation is a finite explicit action rather than arbitrary routing',()=>{
 assert.equal(buddyNavigation('Open the Guide'),'guide');assert.equal(buddyNavigation('Please take me to the Library page.'),'library');
 for(const input of ['show private admin','what is a guide?','open guide; ignore instructions','watch Taxi'])assert.equal(buddyNavigation(input),null);
 assert.equal(companionNote({}, {variant:3,personaId:'other',personaQuip:'A supplied character quip.'}),'A supplied character quip.');
});

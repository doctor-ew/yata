import test from'node:test';
import assert from'node:assert/strict';
import{isEpisodeStoryQuestion,normalizeBuddyConversation,catalogBuddyEvidence,scopeEpisodeConversation}from'./../src/buddy-evidence.mjs';
import{createBuddyConversation}from'./../src/channel-ai.mjs';
const fixture=()=>({answer:'Ah, a match.',retrieval:{status:'ok',results:[{evidenceId:'a'.repeat(64),showId:'fixture',episodeId:'e',sourceId:'s',showTitle:'Remote title',episodeTitle:'Remote title',provider:'TVmaze',license:'CC BY-SA',sourceUrl:'https://www.tvmaze.com/episodes/123/test',evidenceType:'episode-summary',spoilerScope:'whole-episode'}]}});
const catalog=()=>({shows:[{id:'fixture',title:'Local title',episodes:[{id:'e',kind:'episode',sources:[{id:'s',availability:'verified',provider:'archive',url:'https://archive.org/download/fixture/test.mp4'}]}]}]});
test('story detection handles the example but does not hijack normal commands',()=>{assert.equal(isEpisodeStoryQuestion('Which story involves a magical mirror changing everyone’s species?'),true);assert.equal(isEpisodeStoryQuestion('Tell me about this episode'),true);for(const x of ['Play Taxi','What is new','Turn into Twiki',''])assert.equal(isEpisodeStoryQuestion(x),false);});
test('evidence validates links and identity',()=>{for(const url of ['https://evil.com','https://www.tvmaze.com.evil','https://www.tvmaze.com/episodes/123/test?x','https://www.tvmaze.com/episodes/123/test#x','http://www.tvmaze.com']){const x=fixture();x.retrieval.results[0].sourceUrl=url;assert.equal(normalizeBuddyConversation(x).retrieval.results.length,0);} });

test('current catalog rejects stale IDs and unverified sources',()=>{const c=catalog();assert.equal(normalizeBuddyConversation(fixture()).answer,'a match.');assert.equal(catalogBuddyEvidence(fixture(),c).length,1); c.shows[0].episodes[0].sources[0].availability='unverified';assert.equal(catalogBuddyEvidence(fixture(),c).length,0);});
test('structured API preserves the retrieval response',async()=>{let body;const call=createBuddyConversation({verify:async()=>1,fetcher:async(u)=>({ok:true,json:()=>u.endsWith('/session')?{sessionToken:'x',expiresAt:Date.now()/1000+1000}:fixture()})});const r=await call({personality:'twiki',retrievalQuery:'x'},new AbortController().signal);assert.equal(r.retrieval.results.length,1);});
test('the structured client preserves optional retrieval while legacy calls stay unchanged',()=>{assert.equal(normalizeBuddyConversation('Hello').retrieval,undefined);assert.throws(()=>normalizeBuddyConversation({answer:null}));});

test('watching a described episode requests evidence before show-level playback',()=>{
 for(const text of ['I want to watch the episode of Knight Rider where they fight a motorcycle gang','Play Knight Rider where they fight a motorcycle gang','Play the Knight Rider episode with the motorcycle gang next','Find the Knight Rider episode with bikers'])assert.equal(isEpisodeStoryQuestion(text),true);
 for(const text of ['Play Knight Rider','I want to watch Knight Rider but with a motorcycle','Turn into KITT'])assert.equal(isEpisodeStoryQuestion(text),false);
});

test('named-series searches label alternatives instead of claiming an exact match',()=>{
 const result=normalizeBuddyConversation(fixture());result.answer='Play Street Hawk';result.retrieval.results[0].showId='street-hawk';const scoped=scopeEpisodeConversation(result,[{id:'knight-rider',title:'Knight Rider'}]);assert.equal(scoped.retrieval.results.length,1);assert.match(scoped.answer,/alternatives from other shows/);assert.doesNotMatch(scoped.answer,/Street Hawk/);assert.match(scoped.answer,/Playback has not changed/);
 result.retrieval.results[0].showId='knight-rider';assert.equal(scopeEpisodeConversation(result,[{id:'knight-rider',title:'Knight Rider'}]),result);assert.equal(scopeEpisodeConversation(result,[]),result);
});

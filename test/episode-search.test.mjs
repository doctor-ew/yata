import test from 'node:test';
import assert from 'node:assert/strict';
import {searchEpisodes,resolveEpisodeSearchResult,isEpisodeCollection} from '../src/episode-search.mjs';
const ep=(id,title,season=1,number=1,ready=true)=>({id,title,season,number,kind:'episode',durationSeconds:100,sources:[{id:id+'-source',provider:'archive',availability:ready?'verified':'unverified',url:'https://archive.org/download/search-test/'+id+'.mp4'}]});
const catalog={shows:[{id:'knight',title:'Knight Rider',channel:'action',episodes:[ep('white-rock','Good Day at White Rock'),ep('gold','Chariot of Gold',2)]},{id:'grimm',title:'Grimm’s Fairy Tale Classics',channel:'cartoons',episodes:[ep('stories','Snow White / Briar Rose · VHS collection',0),ep('snow','Snow White',1,2),ep('unchecked','Snow White trailer',1,3,false),{...ep('break','Snow White advert'),kind:'bumper'}]}]};
test('global title search crosses shows and ranks exact story title ahead of collections',()=>{
 const found=searchEpisodes(catalog,{query:'Snow White'});
 assert.equal(found.total,3);assert.equal(found.results[0].episodeId,'snow');assert.ok(found.results.some(r=>r.episodeId==='stories'&&r.collection));assert.ok(!found.results.some(r=>r.episodeId==='break'));
 assert.equal(searchEpisodes(catalog,{query:'knight gold'}).results[0].episodeId,'gold');
 assert.equal(searchEpisodes(catalog,{query:'briar'}).results[0].episodeId,'stories');
 assert.equal(searchEpisodes(catalog,{query:'a plot absent from titles'}).total,0);
});
test('global search combines existing library filters and never mutates or splits collections',()=>{
 const before=JSON.stringify(catalog),meta={knight:{year:1982,genres:['Action']},grimm:{year:1987,genres:['Fantasy']}};
 assert.equal(searchEpisodes(catalog,{query:'white',metadata:meta,filters:{channel:'action',genre:'Action',decade:'1980',availability:'playable'}}).total,1);
 assert.equal(searchEpisodes(catalog,{query:'white',metadata:meta,filters:{genre:'Crime'}}).total,0);
 assert.equal(searchEpisodes(catalog,{query:'snow',limit:1}).results.length,1);
 assert.equal(searchEpisodes(catalog,{query:'snow',limit:1}).total,3);assert.equal(JSON.stringify(catalog),before);
 assert.equal(isEpisodeCollection(catalog.shows[1].episodes[0]),true);
});
test('bounded input and rendering limits do not manufacture transcript or semantic matches',()=>{
 assert.deepEqual(searchEpisodes(catalog,{query:''}).results,[]);assert.equal(searchEpisodes(catalog,{query:'x'.repeat(201)}).invalid,true);
 assert.equal(searchEpisodes(catalog,{query:Array(13).fill('snow').join(' ')}).invalid,true);
 assert.equal(searchEpisodes(catalog,{query:'enchanted princess wakes from sleep'}).total,0);
 const many={shows:[{id:'many',title:'Many',channel:'action',episodes:Array.from({length:120},(_,i)=>ep('e'+i,'Episode '+i))}]};
 assert.equal(searchEpisodes(many,{query:'episode',limit:999}).results.length,100);assert.equal(searchEpisodes(many,{query:'episode'}).results.length,50);
});
test('playback references re-resolve only current checked catalog identities, never a generated URL',()=>{
 const r=searchEpisodes(catalog,{query:'gold'}).results[0],ref={showId:r.showId,episodeId:r.episodeId,sourceId:r.sourceId};
 assert.equal(resolveEpisodeSearchResult(catalog,ref).source.id,'gold-source');assert.equal(resolveEpisodeSearchResult({shows:[]},ref),null);
 assert.equal(resolveEpisodeSearchResult(catalog,{...ref,sourceId:'invented'}),null);
 assert.equal(resolveEpisodeSearchResult(catalog,{showId:'grimm',episodeId:'unchecked'}),null);
 assert.equal(resolveEpisodeSearchResult(catalog,{showId:'grimm',episodeId:'break'}),null);
 assert.equal(resolveEpisodeSearchResult(catalog,{...ref,episodeId:'invented'}),null);
 assert.ok(!('url' in r));assert.equal(searchEpisodes(catalog,{query:'snow'}).results.find(r=>r.episodeId==='unchecked').playable,false);
});

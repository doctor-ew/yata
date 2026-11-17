import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fetchPublicFeed,validateArtworkFeed,validateGameMetadata,refreshGameMetadata} from '../src/catalog-feeds.mjs';
import {validateLauncherCatalog} from '../src/arcade-catalog.mjs';
const game={id:'test-machine',title:'Test Machine',category:'console',status:'installed',hint:'Controls',frame:'assets/test-machine/index.html'};
const response=data=>({ok:true,headers:new Headers(),text:async()=>JSON.stringify(data)});
const storage=()=>{const values=new Map();return{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};};
test('network JSON updates existing shared game references, then offline launch retains validated cached data',async()=>{
 const cache=storage(),games=[];
 const options={storage:cache,fetcher:async()=>response({version:1,games:[game]})};
 const result=await refreshGameMetadata(games,options);assert.equal(result.source,'network');assert.equal(games[0].id,game.id);assert.equal(games[0].frame,undefined);
 const cached=await refreshGameMetadata(games,{storage:cache,fetcher:async()=>{throw Error('offline');}});assert.equal(cached.source,'cache');assert.equal(games.length,1);
});
test('malformed remote data cannot replace a known-good catalog or poison the cache',async()=>{
 const cache=storage(),good={version:1,games:[game]};cache.setItem('games',JSON.stringify(good));
 const result=await fetchPublicFeed({url:'/catalog',cacheKey:'games',storage:cache,validate:validateGameMetadata,fetcher:async()=>response({version:1,games:[{...game,id:'https://host.invalid'}]})});
 assert.equal(result.source,'cache');assert.equal(result.data.games[0].id,game.id);assert.deepEqual(JSON.parse(cache.getItem('games')),good);
 await assert.rejects(fetchPublicFeed({url:'/catalog',cacheKey:'new',storage:null,validate:validateGameMetadata,fetcher:async()=>response({version:99,games:[]})}));
});
test('bundled metadata remains usable without network or storage, and oversized responses are rejected',async()=>{
 const bundle={version:1,games:[game]};const result=await fetchPublicFeed({url:'/catalog',cacheKey:'games',bundled:bundle,validate:validateGameMetadata,storage:{getItem(){throw Error('blocked');}},fetcher:async()=>({ok:true,headers:new Headers({'content-length':'2000001'}),text:()=>{throw Error('must not read');}})});assert.equal(result.source,'bundle');
});
test('Arcade launcher rejects executable/external/traversal targets, unsupported cores and duplicate identities',()=>{
 for(const patch of[{frame:'javascript:alert(1)'},{frame:'https://host.invalid/a.html'},{file:'assets/../secret.bin'},{cover:'//host.invalid/p.png'},{frame:'assets/%2e%2e/a.html'},{core:'invented',file:'assets/a.bin'}])assert.throws(()=>validateLauncherCatalog({version:1,games:[{...game,...patch}]}));
 assert.throws(()=>validateLauncherCatalog({version:1,games:[game,game]}));assert.equal(validateLauncherCatalog({version:1,games:[game]}).games[0].frame,game.frame);
});
test('shipped public card feeds are schema-valid and private download/credential details stay out of launcher metadata',async()=>{
 const art=validateArtworkFeed(JSON.parse(await readFile(new URL('../data/library-art.json',import.meta.url))),{assetBase:'https://doctorew.com/tv/'});assert.ok(art.shows.gargoyles.image.startsWith('https://doctorew.com/tv/assets/show-art/'));
 const launcher=validateLauncherCatalog(JSON.parse(await readFile(new URL('../arcade/launcher-catalog.json',import.meta.url))));const metadata=validateGameMetadata(JSON.parse(await readFile(new URL('../data/arcade-games.json',import.meta.url))));assert.deepEqual(launcher.games.map(g=>g.id),metadata.games.map(g=>g.id));
 for(const g of launcher.games){assert.equal(g.download,undefined);assert.equal(g.sha256,undefined);assert.equal(g.bytes,undefined);assert.equal(g.apiKey,undefined);}
 assert.throws(()=>validateArtworkFeed({version:1,shows:{bad:{image:'https://host.invalid/a.png'}}}));
});

test('chunked feed reads stop and cancel before consuming an oversized response',async()=>{
 let reads=0,cancelled=false,released=false;
 const reader={async read(){reads++;return{done:false,value:new Uint8Array(1000001)};},async cancel(){cancelled=true;},releaseLock(){released=true;}};
 await assert.rejects(fetchPublicFeed({url:'/feed',validate:validateGameMetadata,cacheKey:'large',storage:null,fetcher:async()=>({ok:true,headers:new Headers(),body:{getReader:()=>reader}})}));
 assert.equal(reads,2);assert.equal(cancelled,true);assert.equal(released,true);
});

test('ratings preserve jurisdiction, series scope and provenance without treating review scores as age ratings',()=>{
 const rating={system:'US-TV',value:'TV-Y7',region:'US',scope:'series',sourceUrl:'https://shows.disney.com/gargoyles',sourceName:'Disney',verifiedOn:'2026-11-17'};
 const feed=r=>validateArtworkFeed({version:1,shows:{gargoyles:{title:'Gargoyles',contentRating:r}}}).shows.gargoyles;
 assert.deepEqual(feed(rating).contentRating,rating);
 assert.equal(feed(undefined).contentRating,undefined);
 for(const patch of[{value:8.1},{system:'IMDb'},{region:'GB'},{scope:'episode'},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:secret@example.com'},{sourceName:''},{verifiedOn:'unknown'},{verifiedOn:'2026-02-30'}])assert.throws(()=>feed({...rating,...patch}));
});

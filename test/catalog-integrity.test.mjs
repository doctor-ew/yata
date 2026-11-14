import test from 'node:test';
import assert from 'node:assert/strict';
import {openCatalogStore,CatalogConflict} from '../src/catalog-store.mjs';
import {createSeed} from '../src/catalog.mjs';
import {validateCatalog,saveCatalog,parseCatalogJson,STORAGE_KEY} from '../src/domain.mjs';
import {excludeEpisode,excludeSource,restoreExcluded} from '../src/exclusions.mjs';
import {mergeLibraryBatch,mergeBatch} from '../src/bulk.mjs';
import {libraryRevision,LIBRARY_MIGRATION_VERSION} from '../scripts/library-revision.mjs';
function fixture() {
 const data=new Map();let queue=Promise.resolve();
 const locks={request(_name,_options,callback){const run=queue.then(callback);queue=run.catch(()=>{});return run;}};
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 let record=null;const database={initialize:async catalog=>{if(!record&&catalog)record={revision:1,catalog:structuredClone(catalog)};return structuredClone(record);},compareAndSave:(revision,catalog)=>locks.request('',{},()=>{if((record?.revision??null)!==revision)throw Object.assign(Error('conflict'),{code:'CATALOG_CONFLICT'});record={revision:(revision??0)+1,catalog:structuredClone(catalog)};return structuredClone(record);}),read:()=>structuredClone(record)};
 saveCatalog(storage,createSeed());return{data,storage,locks,database};
}
test('exclusive concurrent writers accept one snapshot and reject the other without overwriting it',async()=>{
 const f=fixture(),a=await openCatalogStore({...f,seed:createSeed()}),b=await openCatalogStore({...f,seed:createSeed()});
 const first=structuredClone(a.catalog),second=structuredClone(b.catalog);first.shows[0].title='A edit';second.shows[0].title='B edit';
 const results=await Promise.allSettled([a.save(first),b.save(second)]);
 assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert(results[1].reason instanceof CatalogConflict);
 assert.equal(f.database.read().catalog.shows[0].title,'A edit');assert.equal(b.catalog.shows[0].title,createSeed().shows[0].title);assert.equal(second.shows[0].title,'B edit');
});
test('queued drafts from one tab also conflict instead of dropping an earlier change',async()=>{
 const f=fixture(),store=await openCatalogStore({...f,seed:createSeed()});const a=structuredClone(store.catalog),b=structuredClone(store.catalog);a.settings.bumpers=false;b.shows[0].title='Second draft';
 const results=await Promise.allSettled([store.save(a),store.save(b)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.catalog.settings.bumpers,false);
});
test('transaction failure and unavailable transactional storage preserve stored catalog and keep export data readable',async()=>{
 const f=fixture();const original=f.storage.getItem(STORAGE_KEY);const store=await openCatalogStore({...f,seed:createSeed()});
 f.database.compareAndSave=async()=>{throw Error('storage full');};const draft=structuredClone(store.catalog);draft.shows[0].title='Draft';
 await assert.rejects(store.save(draft),/storage full/);assert.equal(f.storage.getItem(STORAGE_KEY),original);assert.notEqual(store.catalog.shows[0].title,'Draft');assert.notEqual(f.database.read().catalog.shows[0].title,'Draft');assert.equal(draft.shows[0].title,'Draft');
 for(const database of[{initialize:async()=>{throw Error('unavailable');}},{initialize:async()=>{throw Error('denied');}}]){const readonly=await openCatalogStore({storage:f.storage,database,seed:createSeed()});assert.equal(readonly.writable,false);await assert.rejects(readonly.save(draft),/read-only/);assert.equal(f.storage.getItem(STORAGE_KEY),original);}
});
test('legacy catalogs round-trip without exclusions and malformed exclusions fail closed',()=>{
 const seed=createSeed();assert.equal(validateCatalog(seed).exclusions,undefined);assert.deepEqual(parseCatalogJson(JSON.stringify(seed)),seed);
 assert.throws(()=>validateCatalog({...seed,exclusions:{episodes:[],sources:[{showId:'dukes',url:'javascript:bad'}]}}));
});
test('deleted curated episode stays deleted on pack replay including changed source URL; export keeps exclusions',()=>{
 const catalog=createSeed(),show=catalog.shows[0],episode=structuredClone(show.episodes[0]);excludeEpisode(catalog,show,episode);show.episodes=[];
 const incoming=structuredClone(episode);incoming.sources[0].url='https://www.youtube.com/watch?v=M7lc1UVf-VE';incoming.sources[0].provider='youtube';
 const rows=[{selected:true,showId:show.id,episode:incoming}];const result=mergeLibraryBatch(parseCatalogJson(JSON.stringify(catalog)),rows);
 assert.equal(result.added,0);assert.equal(result.catalog.shows[0].episodes.length,0);assert.equal(result.catalog.exclusions.episodes.length,1);
});
test('source exclusions preserve custom alternatives and explicit re-add restores the chosen source',()=>{
 const catalog=createSeed(),show=catalog.shows[0],episode=show.episodes[0],old=structuredClone(episode);
 excludeSource(catalog,show.id,episode.sources[0].url);episode.sources=[];
 let result=mergeLibraryBatch(catalog,[{selected:true,showId:show.id,episode:old}]);assert.equal(result.catalog.shows[0].episodes[0].sources.length,0);
 const custom=structuredClone(old);custom.sources=[{id:'custom',provider:'youtube',availability:'unverified',url:'https://www.youtube.com/watch?v=M7lc1UVf-VE'}];
 result=mergeLibraryBatch(result.catalog,[{selected:true,showId:show.id,episode:custom}]);assert.equal(result.alternatives,1);assert.equal(result.catalog.shows[0].episodes[0].sources[0].provider,'youtube');
 restoreExcluded(result.catalog,result.catalog.shows[0],old);
 result=mergeLibraryBatch(result.catalog,[{selected:true,showId:show.id,episode:old}]);assert.equal(result.alternatives,1);
});
test('explicit custom re-add clears the matching episode exclusion without affecting other exclusions',()=>{
 const catalog=createSeed(),show=catalog.shows[0],episode=structuredClone(show.episodes[0]);excludeEpisode(catalog,show,episode);show.episodes=[];
 const restored=mergeBatch(catalog,[{selected:true,showId:show.id,episode}],()=>crypto.randomUUID()).catalog;
 assert.equal(restored.shows[0].episodes.length,1);assert.equal(restored.exclusions,undefined);assert.equal(mergeLibraryBatch(restored,[{selected:true,showId:show.id,episode}]).added,0);
});
test('revision changes for seed-only source, wishlist, or migration changes and remains deterministic',()=>{
 const seed=createSeed(),texts=['pack contents'];const revision=libraryRevision(texts,seed);assert.equal(libraryRevision(texts,seed),revision);
 const source=structuredClone(seed);source.shows[0].episodes[0].sources[0].url+='?updated=1';assert.notEqual(libraryRevision(texts,source),revision);
 const wishlist=structuredClone(seed);wishlist.shows.find(s=>s.id==='midnight-matinee').episodes[0].title+=' revised';assert.notEqual(libraryRevision(texts,wishlist),revision);
 assert.notEqual(libraryRevision(texts,seed,LIBRARY_MIGRATION_VERSION+1),revision);
});

test('owner migration imports legacy once and never mirrors canonical writes over recovery data',async()=>{
 const f=fixture(),legacy=f.storage.getItem(STORAGE_KEY),first=await openCatalogStore({...f,seed:createSeed()});
 const next=structuredClone(first.catalog);next.shows[0].title='Canonical owner draft';await first.save(next);
 assert.equal(f.storage.getItem(STORAGE_KEY),legacy);
 const olderClient=JSON.parse(legacy);olderClient.shows[0].title='Later legacy-only edit';f.storage.setItem(STORAGE_KEY,JSON.stringify(olderClient));
 const second=await openCatalogStore({...f,seed:createSeed()});assert.equal(second.catalog.shows[0].title,'Canonical owner draft');assert.equal(JSON.parse(f.storage.getItem(STORAGE_KEY)).shows[0].title,'Later legacy-only edit');
});

test('notification API denial does not disable transactional owner storage',async()=>{
 const previousWindow=globalThis.window,previousChannel=globalThis.BroadcastChannel;
 globalThis.window={};globalThis.BroadcastChannel=class{constructor(){throw Error('denied');}};
 try{const f=fixture(),store=await openCatalogStore({...f,seed:createSeed()});const next=structuredClone(store.catalog);next.shows[0].title='Saved without notifications';await store.save(next);assert.equal(store.catalog.shows[0].title,'Saved without notifications');}
 finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;globalThis.BroadcastChannel=previousChannel;}
});

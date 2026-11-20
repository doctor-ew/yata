import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {writeFile,readFile} from 'node:fs/promises';
import {createSeed} from '../src/catalog.mjs';
import {validateCatalog} from '../src/domain.mjs';
import {CHANNELS,applyChannelRegistry} from '../src/channels.mjs';
import {defaultChannelRegistry,validateChannelRegistry,assertRegistryEvolution,compatibilityCatalog} from '../src/channel-registry.mjs';
import {fetchPublishedCatalog,REGISTRY_MANIFEST_PATH,PUBLISHED_MANIFEST_PATH,mergePublishedCatalog} from '../src/published-catalog.mjs';
import {createCatalogPublisher,createRegistryCatalogPublisher,frozenCatalog} from '../scripts/catalog-publisher.mjs';
import {availableDialShows} from '../src/dials.mjs';
import {remixLineups} from '../src/remix.mjs';
import {createLineupLink,parseLineupLink,applySharedLineup} from '../src/lineup-share.mjs';
const newChannel={id:'future-documentaries',number:'12',name:'Future Documentaries',subtitle:'Remote test definition.',accent:'#abcdef',fallback:'seventies'};
function fixture(){const c=createSeed();c.shows=c.shows.slice(0,2);c.channelRegistry=defaultChannelRegistry();c.channelRegistry.channels.splice(5,0,{...newChannel});c.shows[0].legacyChannel=c.shows[0].channel;c.shows[0].channel=newChannel.id;return validateCatalog(c);}
function manifest(c){const f=frozenCatalog(c);return{version:2,requires:['channel-registry-v1'],channelIds:c.channelRegistry.channels.map(v=>v.id),revision:f.revision,catalog:`data/catalogs/${f.revision}.json`,updatedAt:'2026-11-20T00:00:00Z',counts:f.counts};}

test('remote definitions are finite data; parsing cannot mutate active channels',()=>{
 const c=fixture(),before=structuredClone(CHANNELS);assert.equal(c.shows[0].channel,newChannel.id);assert.deepEqual(CHANNELS,before);
 for(const mutate of [r=>r.channels.push({...newChannel}),r=>r.channels[1].number='03',r=>r.channels[1].accent='url(https://evil.invalid)',r=>r.channels[1].name='<script>',r=>r.channels[1].url='https://evil.invalid',r=>r.channels.splice(1,1),r=>r.channels[5].id='custom',r=>r.channels[5].id='all',r=>r.channels[5].fallback=newChannel.id]){const r=structuredClone(c.channelRegistry);mutate(r);assert.throws(()=>validateChannelRegistry(r));}
 const r=structuredClone(c.channelRegistry);r.channels[5].number='13';assert.throws(()=>assertRegistryEvolution(c.channelRegistry,r),/append-only/);
 assertRegistryEvolution(defaultChannelRegistry(),c.channelRegistry);
 const invalid=structuredClone(c);delete invalid.channelRegistry;assert.throws(()=>validateCatalog(invalid));assert.deepEqual(CHANNELS,before);
});

test('new channels support scheduling, saved switches, remix, sharing, and legacy projection',()=>{
 const c=fixture(),base=createSeed();base.shows=base.shows.slice(0,2);
 assert.equal(frozenCatalog(compatibilityCatalog(c)).revision,frozenCatalog(base).revision);
 c.settings.channel=newChannel.id;assert(availableDialShows(c,newChannel.id).every(s=>s.channel===newChannel.id));
 const remixed=validateCatalog(remixLineups(c,newChannel.id,{now:5000,seed:()=>42}));assert.equal(remixed.settings.channelRemixes[newChannel.id].seed,42);
 applyChannelRegistry(c.channelRegistry);try{const link=createLineupLink(remixed),d=parseLineupLink(link);assert.equal(d.channel,newChannel.id);assert.equal(applySharedLineup(c,d).settings.channel,newChannel.id);}finally{applyChannelRegistry(defaultChannelRegistry());}
 const previous={settings:{...base.settings,mixChannels:['action'],streamShow:base.shows[0].id,channel:base.shows[0].channel},epoch:base.epoch};
 const merged=mergePublishedCatalog(c,previous);assert.deepEqual(merged.settings.mixChannels,['action']);assert.equal(merged.settings.channel,newChannel.id);assert.equal(merged.settings.streamShow,c.shows[0].id);
 const all=mergePublishedCatalog(c,{settings:base.settings});assert.equal(all.settings.mixChannels,undefined);
});

test('HTTP loader adopts an intact registry snapshot and rejects corruption or manifest mismatch without fallback',async()=>{
 const c=fixture(),f=frozenCatalog(c),m=manifest(c),calls=[];let mode='good';
 const server=createServer((req,res)=>{calls.push(req.url);res.setHeader('Content-Type','application/json');if(req.url==='/'+REGISTRY_MANIFEST_PATH){if(mode==='missing'){res.statusCode=404;res.end('{}');return;}res.end(JSON.stringify(mode==='mismatch'?{...m,channelIds:m.channelIds.toReversed()}:m));}else if(req.url==='/'+PUBLISHED_MANIFEST_PATH){const p=frozenCatalog(compatibilityCatalog(c));res.end(JSON.stringify({...m,version:1,revision:p.revision,catalog:`data/catalogs/${p.revision}.json`,requires:undefined,channelIds:undefined}));}else if(req.url==='/'+m.catalog)res.end(f.text+(mode==='tampered'?' ':''));else{res.statusCode=404;res.end('{}');}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}/`,fetcher=(p,o)=>fetch(new URL(p,origin),o);
 try{assert.equal((await fetchPublishedCatalog({fetcher})).catalog.channelRegistry.channels.length,10);mode='tampered';await assert.rejects(fetchPublishedCatalog({fetcher}),/integrity/);mode='mismatch';await assert.rejects(fetchPublishedCatalog({fetcher}),/does not match/);assert(!calls.includes('/'+PUBLISHED_MANIFEST_PATH));mode='missing';const missing=await fetcher(REGISTRY_MANIFEST_PATH);assert.equal(missing.status,404);}finally{server.close();server.closeAllConnections();}
});

function awsFixture(){const objects=new Map();let serial=0,failLegacy=false;const config={account:'123456789012',region:'us-east-1',bucket:'fixture',distribution:'fixture',base:'/tv/'};return{config,objects,fail(){failLegacy=true;},async runAws(args){const get=k=>args[args.indexOf(k)+1];if(args[0]==='sts')return{Account:config.account};if(args[0]==='cloudfront')return{Invalidation:{Id:'fixture'}};const key=get('--key');if(args[1]==='get-object'){if(!objects.has(key))throw Object.assign(Error('missing'),{code:'NoSuchKey'});const v=objects.get(key);await writeFile(args[args.indexOf('--expected-bucket-owner')+2],v.body);return{ETag:v.etag};}if(failLegacy&&key==='tv/'+PUBLISHED_MANIFEST_PATH)throw Error('offline');const prior=objects.get(key);if(args.includes('--if-none-match')&&prior||args.includes('--if-match')&&prior?.etag!==get('--if-match'))throw Object.assign(Error('stale'),{code:'PreconditionFailed'});objects.set(key,{body:await readFile(get('--body'),'utf8'),etag:`"${++serial}"`});return{};}};}

test('registry publisher preserves the old feed, requires both reviewed heads and reports partial success',async()=>{
 const aws=awsFixture(),old=createCatalogPublisher(aws),publisher=createRegistryCatalogPublisher(aws),c=fixture(),legacy=compatibilityCatalog(c),first=await old.publish(legacy,{expectedRevision:null});
 const review=await publisher.preview(c);assert.equal(review.compatibilityRevision,first.revision);assert.equal(review.baseRevision,null);
 await assert.rejects(publisher.publish(c,{expectedRevision:null}),/compatibility/);
 const options={expectedRevision:review.baseRevision,reviewedRevision:review.revision,compatibilityBaseRevision:review.compatibilityBaseRevision};
 const receipt=await publisher.publish(c,options);assert.equal(receipt.compatibilityPending,false);assert.equal((await old.shared()).revision,first.revision);assert.equal((await publisher.shared()).catalog.channelRegistry.channels.length,10);
 const next=structuredClone(c);next.shows[0].title+=' changed';const second=await publisher.preview(next);aws.fail();const partial=await publisher.publish(next,{expectedRevision:second.baseRevision,reviewedRevision:second.revision,compatibilityBaseRevision:second.compatibilityBaseRevision});assert.equal(partial.compatibilityPending,true);assert.equal((await publisher.shared()).revision,second.revision);assert.equal((await old.shared()).revision,first.revision);
 const removed=structuredClone(next);removed.channelRegistry.channels.splice(5,1);removed.shows[0].channel='action';await assert.rejects(publisher.preview(removed),/append-only/);
 await assert.rejects(publisher.publish(next,{expectedRevision:second.revision,compatibilityBaseRevision:'a'.repeat(64)}),/changed/);
});


test('a native-created analytics singleton can adopt the accepted registry independently of module copies',async()=>{
 const {createAnalytics}=await import('../src/analytics.mjs');let payload;
 const a=createAnalytics({randomId:()=> 'a'.repeat(32),fetcher:async(_,o)=>{payload=JSON.parse(o.body);return{ok:true};}});
 a.record('play_start',{channel:newChannel.id});a.setChannelRegistry(fixture().channelRegistry);a.record('play_start',{channel:newChannel.id});a.record('play_start',{channel:'arbitrary-channel'});await a.flush();assert.deepEqual(payload.events.map(e=>e.channel),[newChannel.id]);
});

test('Game Shows migration preserves Nick and exactly projects the old inventory',async()=>{
 const {migrateChannelRegistry,GAME_SHOW_IDS}=await import('../scripts/migrate-channel-registry.mjs');
 const registry=JSON.parse(await readFile(new URL('../data/channel-registry.json',import.meta.url),'utf8'));
 const c=createSeed();c.shows=[{id:'double-dare',title:'Double Dare',channel:'nick',imdbUrl:null,episodes:[]},...GAME_SHOW_IDS.map((id,i)=>({id,title:id,channel:i%2?'seventies':'comedy',imdbUrl:null,episodes:[]}))];
 const next=migrateChannelRegistry(c,registry);assert.equal(next.shows.filter(s=>s.channel==='game-shows').length,20);assert.equal(next.shows[0].channel,'nick');assert.equal(frozenCatalog(compatibilityCatalog(next)).revision,frozenCatalog(c).revision);assert.deepEqual(migrateChannelRegistry(next,registry),next);
 c.shows.pop();assert.throws(()=>migrateChannelRegistry(c,registry),/Missing existing collection/);
});

test('remote reassignment retains the saved Channel 00 queue and personal show lineup',()=>{
 const c=fixture(),show=c.shows[0];show.episodes=[{id:'queued-episode',title:'Queue fixture',season:1,number:1,durationSeconds:1200,kind:'episode',group:'',sources:[{id:'queued-source',provider:'archive',availability:'verified',url:'https://archive.org/download/registry-fixture/queue.mp4'}]}];
 const previous={settings:{...c.settings,customShows:[show.id],customTitle:'Saved collection',customQueue:[{showId:show.id,episodeId:'queued-episode',sourceId:'queued-source'}],customMode:'episodes',customQueueActive:true},epoch:c.epoch};
 const merged=mergePublishedCatalog(c,previous);assert.deepEqual(merged.settings.customQueue,previous.settings.customQueue);assert.deepEqual(merged.settings.customShows,[show.id]);assert.equal(merged.settings.customQueueActive,true);
});

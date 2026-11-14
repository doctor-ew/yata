import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHANNELS, createSeed } from '../src/catalog.mjs';
import { MOVIE_SHOW_ID } from '../src/collections.mjs';
import { SCI_FI_SHOW_IDS } from '../src/channels.mjs';
import { validateCatalog, readCatalog, buildSchedule, STORAGE_KEY, COMMERCIAL_SHOW_ID } from '../src/domain.mjs';
import { availableDialShows, nextDialShow, randomDialPatch } from '../src/dials.mjs';

const legacy = () => {
  const catalog = createSeed();
  catalog.shows = catalog.shows.filter(show => show.id !== MOVIE_SHOW_ID);
  for (const show of catalog.shows) if (show.channel === 'scifi') show.channel = 'action';
  catalog.settings = {...catalog.settings, channel:'action', streamShow:'buck-rogers', bumpers:false, commercialCount:3, shuffleSeed:87};
  catalog.shows.find(s=>s.id==='buck-rogers').episodes.push({id:'custom-buck',title:'My episode',season:1,number:1,durationSeconds:1200,kind:'episode',group:'My group',sources:[{id:'custom-source',provider:'archive',url:'https://archive.org/download/buck-fixture/episode.mp4',availability:'verified'}]});
  catalog.shows.push({id:'my-show',title:'My show',channel:'action',imdbUrl:null,episodes:[]});
  return catalog;
};

test('six channels place Sci-Fi third and keep animated science fiction on Saturday Morning', () => {
  assert.deepEqual(CHANNELS.map(c=>[c.id,c.number]), [['mixed','01'],['action','02'],['scifi','03'],['cartoons','04'],['comedy','05'],['seventies','06']]);
  const seed=createSeed();
  assert.deepEqual(new Set(seed.shows.filter(s=>s.channel==='scifi' && s.id!==MOVIE_SHOW_ID).map(s=>s.id)), SCI_FI_SHOW_IDS);
  for(const id of ['transformers','mighty-orbots','space-ghost']) assert.equal(seed.shows.find(s=>s.id===id).channel,'cartoons');
  for(const id of ['knight-rider','greatest-american-hero','manimal']) assert.equal(seed.shows.find(s=>s.id===id).channel,'action');
});

test('legacy catalogs migrate classifications and selected show without changing source or playback preferences', () => {
  const before=legacy(),original=structuredClone(before),after=validateCatalog(before);
  assert.deepEqual(before,original);
  assert.equal(after.settings.channel,'scifi');
  assert.deepEqual(after.settings,{...original.settings,channel:'scifi'});
  assert.deepEqual(after.shows.find(s=>s.id==='buck-rogers').episodes,original.shows.find(s=>s.id==='buck-rogers').episodes);
  assert.equal(after.shows.find(s=>s.id==='my-show').channel,'action');
  assert.deepEqual(validateCatalog(after),after);
  const mixed=legacy();mixed.settings.channel='mixed';assert.equal(validateCatalog(mixed).settings.channel,'mixed');
  const customCategory=legacy();customCategory.settings.streamShow=null;customCategory.shows.find(s=>s.id==='buck-rogers').channel='cartoons';assert.equal(validateCatalog(customCategory).shows.find(s=>s.id==='buck-rogers').channel,'cartoons');
});

test('saved catalog migration persists once and remains usable with blocked storage', () => {
  const raw=JSON.stringify(legacy());let saved=raw,writes=0;
  const storage={getItem:key=>{assert.equal(key,STORAGE_KEY);return saved;},setItem:(key,value)=>{assert.equal(key,STORAGE_KEY);saved=value;writes++;}};
  assert.equal(readCatalog(storage,createSeed()).catalog.settings.channel,'scifi');assert.equal(writes,1);
  assert.equal(JSON.parse(saved).shows.find(s=>s.id==='battlestar').channel,'scifi');
  readCatalog(storage,createSeed());assert.equal(writes,1);
  const blocked=readCatalog({getItem:()=>raw,setItem:()=>{throw Error('blocked');}},createSeed());
  assert.equal(blocked.error,null);assert.equal(blocked.catalog.settings.streamShow,'buck-rogers');
  let touched=false;const damaged=readCatalog({getItem:()=>'{',setItem:()=>{touched=true;}},createSeed());
  assert(damaged.error);assert.equal(touched,false);
});

test('Sci-Fi schedules and dials use only checked science-fiction programs with existing commercial rules', async () => {
  const catalog=validateCatalog(JSON.parse(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8')));
  catalog.settings.channel='scifi';catalog.settings.bumpers=false;
  const schedule=buildSchedule(catalog),programs=schedule.filter(e=>e.episode.kind==='episode');
  assert.equal(new Set(programs.map(e=>e.episode.id)).size,286);
  assert(programs.every(e=>e.show.channel==='scifi'));
  assert.equal(availableDialShows(catalog).length,15);
  assert.equal(nextDialShow(catalog,'buck-rogers').id,'battlestar');
  const patch=randomDialPatch(catalog,{mode:'show',seed:42,random:()=>0,currentShowId:'buck-rogers'});
  assert.equal(catalog.shows.find(s=>s.id===patch.streamShow).channel,'scifi');
  catalog.settings.bumpers=true;catalog.settings.commercialCount='random';
  const withBreaks=buildSchedule(catalog);
  assert(withBreaks.some(e=>e.show.id===COMMERCIAL_SHOW_ID));
  assert(withBreaks.filter(e=>e.episode.kind==='episode').every(e=>e.show.channel==='scifi'));
  assert.throws(()=>validateCatalog({...catalog,settings:{...catalog.settings,channel:'unknown'}}));
});

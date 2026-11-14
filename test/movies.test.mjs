import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MOVIE_SHOW_ID, ADDITIONAL_SCIFI_SERIES, MOVIE_WISHLIST } from '../src/collections.mjs';
import { createSeed } from '../src/catalog.mjs';
import { validateCatalog, buildSchedule, stationSource, COMMERCIAL_SHOW_ID } from '../src/domain.mjs';
import { availableDialShows, nextDialShow, randomDialPatch } from '../src/dials.mjs';
import { extendLibraryCatalog, discoveryRows, mergeLibraryBatch } from '../src/bulk.mjs';
import { playbackQueue } from '../src/transport.mjs';

const entry = (id, kind='episode') => ({id,title:id,kind,season:0,number:1,durationSeconds:3600,group:'',sources:[{id:`source-${id}`,provider:'archive',availability:'verified',url:`https://archive.org/download/movie-test/${id}.mp4`}]});
function fixture() {
 return validateCatalog({version:1,epoch:0,settings:{channel:'mixed',bumpers:false,rotation:'random',shuffleSeed:3,storiesPerTurn:1,commercialCount:2,streamShow:null},shows:[
  {id:'series',title:'Series',channel:'scifi',episodes:[entry('tv')]},
  {id:MOVIE_SHOW_ID,title:'Midnight Matinee',channel:'scifi',episodes:[entry('film-one'),entry('film-two'),{...entry('wish'),durationSeconds:null,sources:[]}]},
  {id:COMMERCIAL_SHOW_ID,title:'Commercials',channel:'cartoons',episodes:[entry('ad','bumper')]},
 ]});
}

test('feature films never enter ordinary TV station mixes, including ordered rotation', () => {
 for(const rotation of ['random','ordered'])for(const channel of ['mixed','scifi','action','cartoons']){
  const catalog=fixture();catalog.settings={...catalog.settings,rotation,channel};
  assert(buildSchedule(catalog).every(slot=>slot.show.id!==MOVIE_SHOW_ID));
 }
});

test('explicit movie streams contain complete films and optional breaks, never TV or wishlist items', () => {
 const catalog=fixture();catalog.settings.channel='scifi';catalog.settings.streamShow=MOVIE_SHOW_ID;
 for(const rotation of ['random','ordered']){
  catalog.settings.rotation=rotation;
  assert.deepEqual(new Set(buildSchedule(catalog).map(slot=>slot.episode.id)),new Set(['film-one','film-two']));
  catalog.settings.bumpers=true;
  const queue=buildSchedule(catalog);assert(queue.some(slot=>slot.show.id===COMMERCIAL_SHOW_ID));assert(queue.filter(slot=>slot.episode.kind==='episode').every(slot=>slot.show.id===MOVIE_SHOW_ID));
  catalog.settings.bumpers=false;
 }
 const manual=playbackQueue(catalog,{showId:MOVIE_SHOW_ID,queueMode:'show'});assert.equal(manual.length,2);assert(manual.every(slot=>slot.show.id===MOVIE_SHOW_ID));
});

test('TV tuning dials exclude movie collections even after an explicit movie selection', () => {
 const catalog=fixture();catalog.settings.channel='scifi';catalog.settings.streamShow=MOVIE_SHOW_ID;
 assert.deepEqual(availableDialShows(catalog).map(show=>show.id),['series']);
 assert.equal(nextDialShow(catalog,MOVIE_SHOW_ID).id,'series');
 for(const mode of ['channel','all','show'])assert.notEqual(randomDialPatch(catalog,{mode,seed:22}).streamShow,MOVIE_SHOW_ID);
});

test('library upgrades add series and movie wishlist without replacing saved sources or preferences', async () => {
 const seed=createSeed(),old=fixture();old.shows=old.shows.filter(show=>show.id!==MOVIE_SHOW_ID);old.settings.channel='scifi';old.settings.streamShow='series';
 const original=structuredClone(old),base=extendLibraryCatalog(old,seed);
 assert.deepEqual(old,original);assert.deepEqual(base.settings,original.settings);assert.deepEqual(base.shows.find(show=>show.id==='series').episodes,original.shows[0].episodes);
 assert.equal(base.shows.find(show=>show.id===MOVIE_SHOW_ID).episodes.length,MOVIE_WISHLIST.length);
 for(const [id]of ADDITIONAL_SCIFI_SERIES)assert(base.shows.some(show=>show.id===id));
 const packs=await Promise.all(['scifi','movies'].map(async name=>JSON.parse(await readFile(new URL(`../data/${name}-discovery.json`,import.meta.url)))));
 const rows=discoveryRows(base,packs),installed=mergeLibraryBatch(base,rows).catalog;
 assert.deepEqual(installed.settings,old.settings);
 const movies=installed.shows.find(show=>show.id===MOVIE_SHOW_ID);assert.equal(movies.episodes.filter(stationSource).length,5);assert.equal(movies.episodes.filter(e=>!e.sources.length).length,5);
 assert.equal(mergeLibraryBatch(extendLibraryCatalog(installed,seed),rows).added,0);
 assert.deepEqual(installed.shows.find(show=>show.id==='space-academy').episodes.map(e=>e.number),[1,2,3,8]);
});

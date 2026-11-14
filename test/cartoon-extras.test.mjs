import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCatalogJson,buildSchedule} from '../src/domain.mjs';
const data=new URL('../data/',import.meta.url);
test('Additional cartoons preserve whole programs, label embedded ads and omit extras',async()=>{
 const pack=JSON.parse(await readFile(new URL('cartoon-extras-discovery.json',data),'utf8'));
 assert.deepEqual(pack.shows.map(s=>[s.showId,s.episodes.length]),[['mister-t',9],['frankenstein-impossibles',18]]);
 const mr=pack.shows[0],bundles=pack.shows[1];
 assert.ok(mr.episodes.every(e=>/recorded with commercials/.test(e.title)&&e.season===0));
 assert.equal(new Set(mr.episodes.map(e=>e.number)).size,mr.episodes.length);
 assert.ok(bundles.episodes.every(e=>e.durationSeconds>=1100&&e.durationSeconds<=1500&&/collection order/.test(e.title)&&e.season===0));
 assert.ok(pack.shows.flatMap(s=>s.episodes).every(e=>e.sources.every(s=>s.availability==='verified')));
 const c=parseCatalogJson(await readFile(new URL('expanded-catalog.json',data),'utf8'));
 for(const [id,count] of [['hong-kong-phooey',16],['inch-high',13],['birdman',20],['jonny-quest',26],['mister-t',9],['frankenstein-impossibles',18]])assert.equal(c.shows.find(s=>s.id===id).episodes.length,count);
 c.settings={...c.settings,channel:'cartoons',streamShow:null,bumpers:false};
 const schedule=buildSchedule(c);
 for(const id of ['mister-t','frankenstein-impossibles'])assert.ok(schedule.some(e=>e.show.id===id));
});

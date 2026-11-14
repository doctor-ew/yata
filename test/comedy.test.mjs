import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCatalogJson,buildSchedule} from '../src/domain.mjs';
import {availableDialShows} from '../src/dials.mjs';
test('Comedy tunes only the three requested series and participates in all-show mixes',async()=>{
 const c=parseCatalogJson(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 c.settings={...c.settings,channel:'comedy',streamShow:null,bumpers:false};
 assert.deepEqual(c.shows.filter(s=>s.channel==='comedy').map(s=>s.id),['barney-miller','mork-mindy','love-boat']);
 const schedule=buildSchedule(c);assert.ok(schedule.length>0);
 assert.ok(schedule.every(e=>e.show.channel==='comedy'));
 assert.deepEqual(availableDialShows(c).map(s=>s.id),['barney-miller','mork-mindy','love-boat']);
 c.settings.channel='mixed';assert.ok(buildSchedule(c).some(e=>e.show.channel==='comedy'));
 const pack=JSON.parse(await readFile(new URL('../data/comedy-discovery.json',import.meta.url),'utf8'));
 assert.deepEqual(pack.shows.map(s=>s.episodes.length),[1,24,4]);
 assert.ok(pack.shows.flatMap(s=>s.episodes).every(e=>e.durationSeconds>=1100&&e.sources.every(s=>s.availability==='verified')));
});

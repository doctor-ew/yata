import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCatalogJson,buildSchedule} from '../src/domain.mjs';
import {availableDialShows} from '../src/dials.mjs';
test('Comedy tunes the requested series and participates in all-show mixes',async()=>{
 const c=parseCatalogJson(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 c.settings={...c.settings,channel:'comedy',streamShow:null,bumpers:false};
 assert.deepEqual(c.shows.filter(s=>s.channel==='comedy').map(s=>s.id),['barney-miller','mork-mindy','love-boat','benson','taxi','wkrp','good-times','jeffersons','sanford-son','gimme-break','kotter','whos-boss','sledge-hammer','mr-merlin','soap','police-squad','alf','perfect-strangers','small-wonder','muppet-show','room-222']);
 const schedule=buildSchedule(c);assert.ok(schedule.length>0);
 assert.ok(schedule.every(e=>e.show.channel==='comedy'));
 assert.deepEqual(availableDialShows(c).map(s=>s.id),['barney-miller','mork-mindy','love-boat','benson','taxi','wkrp','good-times','jeffersons','sanford-son','gimme-break','kotter','sledge-hammer','mr-merlin','soap','police-squad','alf','perfect-strangers','small-wonder','muppet-show','room-222']);
 c.settings.channel='mixed';assert.ok(buildSchedule(c).some(e=>e.show.channel==='comedy'));
 const pack=JSON.parse(await readFile(new URL('../data/comedy-discovery.json',import.meta.url),'utf8'));
 assert.deepEqual(pack.shows.map(s=>s.episodes.length),[1,24,4]);
 assert.ok(pack.shows.flatMap(s=>s.episodes).every(e=>e.durationSeconds>=1100&&e.sources.every(s=>s.availability==='verified')));
});

test('Benson contributes checked numbered episodes without duplicate encodes',async()=>{
 const pack=JSON.parse(await readFile(new URL('../data/benson-discovery.json',import.meta.url),'utf8'));
 const episodes=pack.shows[0].episodes;
 assert.ok(episodes.length>0);
 assert.equal(new Set(episodes.map(e=>`${e.season}:${e.number}`)).size,episodes.length);
 assert.ok(episodes.every(e=>e.season>=1&&e.season<=7&&e.durationSeconds>=1100&&e.sources.every(s=>s.availability==='verified')));
 const c=parseCatalogJson(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 assert.equal(c.shows.find(s=>s.id==='benson').episodes.length,episodes.length);
});

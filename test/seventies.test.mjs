import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {parseCatalogJson,buildSchedule} from '../src/domain.mjs';
import {availableDialShows} from '../src/dials.mjs';
test('70s Prime Time schedules checked episodes and retains Barnaby as an honest wishlist',async()=>{
 const c=parseCatalogJson(await readFile(new URL('../data/expanded-catalog.json',import.meta.url),'utf8'));
 c.settings={...c.settings,channel:'seventies',streamShow:null,bumpers:false};
 assert.deepEqual(c.shows.filter(s=>s.channel==='seventies').map(s=>[s.id,s.episodes.length]),[['barnaby-jones',0],['baretta',58],['bj-bear',12],['rockford-files',120],['kolchak',22]]);
 const schedule=buildSchedule(c);assert.ok(schedule.length);assert.ok(schedule.every(e=>e.show.channel==='seventies'));
 assert.deepEqual(availableDialShows(c).map(s=>s.id),['baretta','bj-bear','rockford-files','kolchak']);
 c.settings.channel='mixed';assert.ok(buildSchedule(c).some(e=>e.show.id==='baretta'));
});

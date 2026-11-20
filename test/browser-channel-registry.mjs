// Owned browser against local HTTP and deterministic immutable catalog fixtures.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createSeed} from '../src/catalog.mjs';
import {defaultChannelRegistry} from '../src/channel-registry.mjs';
import {frozenCatalog} from '../scripts/catalog-publisher.mjs';
const {chromium}=await import(process.argv[2]||'playwright');
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const [out]=await once(child.stdout,'data'),origin=String(out).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 const catalog=createSeed();catalog.shows=catalog.shows.slice(0,2);catalog.settings.bumpers=false;
 for(const s of catalog.shows)s.episodes=[{id:s.id+'-test',title:s.title+' fixture',season:1,number:1,durationSeconds:1200,kind:'episode',group:'',sources:[{id:'fixture',provider:'archive',availability:'verified',url:`https://archive.org/download/registry-fixture/${s.id}.mp4`}]}];
 catalog.channelRegistry=defaultChannelRegistry();let mode='base';
 function snapshot(){const c=structuredClone(catalog);if(mode!=='base'){c.channelRegistry.channels.splice(5,0,{id:'future-documentaries',number:'12',name:'Future Documentaries',subtitle:'Added without changing client code.',accent:'#abcdef',fallback:'seventies'});c.shows[0].legacyChannel=c.shows[0].channel;c.shows[0].channel='future-documentaries';}return frozenCatalog(c);}
 browser=await chromium.launch({headless:true,executablePath:process.argv[3]});const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 await ctx.route(origin+'/',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('<head>','<head><meta name="drew-tv-hosting" content="static">')});});
 await ctx.route('**/data/published-catalog-v3-manifest.json',route=>{const f=snapshot();return route.fulfill({json:{version:2,requires:['channel-registry-v1'],channelIds:f.catalog.channelRegistry.channels.map(c=>c.id),revision:f.revision,catalog:`data/catalogs/${f.revision}.json`,counts:f.counts,updatedAt:new Date().toISOString()}});});
 await ctx.route('**/data/catalogs/*.json',r=>r.fulfill({contentType:'application/json',body:snapshot().text+(mode==='tampered'?' ':'')}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#guide');await page.locator('.tv-guide-row').first().waitFor();assert.equal(await page.locator('.tv-guide-row').count(),9);
 await page.locator('#mix-panel').evaluate(e=>e.open=true);await page.locator('#mix-panel input[value="drama"]').uncheck();
 mode='expanded';await page.locator('a[href="#library"]').first().click();await page.getByRole('button',{name:'Refresh shared catalog',exact:true}).click();await page.locator('a[href="#guide"]').first().click();await page.getByRole('button',{name:'Channel 12: Future Documentaries',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelectorAll('.tv-guide-row').length===10);
 assert.equal(await page.locator('#mix-panel input[value="drama"]').isChecked(),false);assert.equal(await page.locator('#mix-panel input[value="future-documentaries"]').isChecked(),false);
 assert.equal(await page.locator('#library-channel option[value="future-documentaries"]').count(),1);assert.equal(await page.locator('#remix-panel option[value="future-documentaries"]').count(),1);
 await page.locator('#mix-panel').getByRole('button',{name:'All on',exact:true}).click();assert.equal(await page.locator('#mix-panel input[value="future-documentaries"]').isChecked(),true);
 await page.getByRole('button',{name:'Channel 12: Future Documentaries',exact:true}).click();assert.match(await page.locator('#channel-label').innerText(),/CH 12.*FUTURE DOCUMENTARIES/);
 await page.reload();await page.getByRole('button',{name:'Channel 12: Future Documentaries',exact:true}).waitFor();assert.match(await page.locator('#channel-label').innerText(),/CH 12.*FUTURE DOCUMENTARIES/);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('yata.viewer-settings.v1')));assert.equal(saved.settings.channel,'future-documentaries');
 // A corrupt new revision cannot mutate accepted definitions or selection.
 catalog.shows[1].title+=' changed';mode='tampered';await page.locator('a[href="#library"]').first().click();await page.getByRole('button',{name:'Refresh shared catalog',exact:true}).click();await page.locator('a[href="#guide"]').first().click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('integrity'));assert.match(await page.locator('#channel-label').innerText(),/CH 12.*FUTURE DOCUMENTARIES/);await page.waitForFunction(()=>document.querySelectorAll('.tv-guide-row').length===10);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);console.log('Passed live registry addition, guide/library/mix/remix controls, opt-out/all-on behavior, saved selection, integrity rejection and mobile width.');
}finally{await browser?.close();child.kill();}

// Optional browser regression: installed Playwright module path, then optional
// Chromium executable path. All publisher and snapshot responses are mocked.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createSeed} from '../src/catalog.mjs';
import {STORAGE_KEY} from '../src/domain.mjs';
import {catalogCounts} from '../src/published-catalog.mjs';
const {chromium}=await import(process.argv[2]||'playwright');
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
const edition=(catalog)=>{const text=JSON.stringify(catalog),revision=createHash('sha256').update(text).digest('hex');return {text,catalog,revision,manifest:{version:1,revision,catalog:`data/catalogs/${revision}.json`,updatedAt:new Date().toISOString(),counts:catalogCounts(catalog)}};};
try {
 const [out]=await once(child.stdout,'data'),origin=String(out).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const initial=createSeed();initial.shows.push({id:'published-initial',title:'Shared master only show',channel:'scifi',imdbUrl:null,episodes:[]});
 let master=edition(initial);
 const legacy=createSeed();legacy.shows.push({id:'unpublished-personal',title:'Unpublished personal show',channel:'scifi',imdbUrl:null,episodes:[]});legacy.publishedRevision=master.revision;legacy.settings.bumpers=false;
 const legacyRaw=JSON.stringify(legacy);
 async function context(publicView=true) {
  const ctx=await browser.newContext();
  await ctx.addInitScript(({raw,key})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,raw);localStorage.setItem('yata.commercial-default.v2','1');}},{raw:legacyRaw,key:STORAGE_KEY});
  await ctx.route('https://archive.org/**',route=>route.abort());
  if(publicView)await ctx.route(origin+'/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<head>','<head><meta name="drew-tv-hosting" content="static">')});});
  await ctx.route('**/data/published-catalog-manifest.json',route=>route.fulfill({json:master.manifest}));
  await ctx.route('**/data/catalogs/*.json',route=>route.fulfill({contentType:'application/json',body:master.text}));
  return ctx;
 }
 const publicCtx=await context(),a=await publicCtx.newPage(),b=await publicCtx.newPage();const errors=[];
 for(const page of[a,b])page.on('pageerror',error=>errors.push(error.message));
 await Promise.all([a.goto(origin),b.goto(origin)]);
 for(const page of[a,b]){
  await page.getByRole('button',{name:'Refresh shared catalog',exact:true}).waitFor();
  await page.getByRole('button',{name:'View episodes and sources for Shared master only show',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('#library-grid').textContent.includes('Unpublished personal show'));
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),legacyRaw);
  assert.equal(await page.locator('#bumpers').isChecked(),false);
  assert.equal(await page.locator('.owner-publisher').count(),0);
 }
 await a.locator('#channels button').nth(1).click();await a.waitForFunction(()=>document.querySelector('#channel-label').textContent.includes('ACTION ADVENTURE'));
 await b.locator('#channels button').nth(2).click();await b.waitForFunction(()=>document.querySelector('#channel-label').textContent.includes('SCI-FI'));
 assert.equal(await a.locator('#catalog-recovery').count(),0);assert.equal(await b.locator('#catalog-recovery').count(),0);
 await a.getByRole('button',{name:'View episodes and sources for The Dukes of Hazzard',exact:true}).click();await a.locator('#show-dialog').getByRole('button',{name:'▶ Internet Archive',exact:true}).click();
 await a.locator('#player-host video').waitFor();await a.evaluate(()=>{window.retainedPlayer=document.querySelector('#player-host video');});
 const newer=createSeed();for(const [id,title,channel]of[['published-action','Owner’s new action show','action'],['published-scifi','Owner’s new sci-fi show','scifi']])newer.shows.push({id,title,channel,imdbUrl:null,episodes:[]});master=edition(newer);
 for(const page of[a,b]){await page.getByRole('button',{name:'Refresh shared catalog',exact:true}).click();}
 await a.getByRole('button',{name:'View episodes and sources for Owner’s new action show',exact:true}).waitFor();
 await b.getByRole('button',{name:'View episodes and sources for Owner’s new sci-fi show',exact:true}).waitFor();
 assert.equal(await a.evaluate(()=>document.querySelector('#player-host video')===window.retainedPlayer),true);
 assert.match(await a.locator('#channel-label').textContent(),/ACTION ADVENTURE/);assert.match(await b.locator('#channel-label').textContent(),/SCI-FI/);
 assert.equal(await a.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),legacyRaw);
 await publicCtx.route('**/data/published-catalog-manifest.json',route=>route.fulfill({status:403,body:'Access denied'}));
 await b.getByRole('button',{name:'Refresh shared catalog',exact:true}).click();await b.locator('#notice').filter({hasText:'refresh failed'}).waitFor();
 assert.equal(await b.getByRole('button',{name:'View episodes and sources for Owner’s new sci-fi show',exact:true}).count(),1);
 assert.deepEqual(errors,[]);await publicCtx.close();
 // A failed first manifest read exposes no source catalog or seed playback.
 const failed=await context();await failed.route('**/data/published-catalog-manifest.json',route=>route.fulfill({status:403,body:'Access denied'}));
 await failed.route('**/data/library-manifest.json',route=>route.fulfill({json:{revision:'fallback'}}));await failed.route('**/data/*-discovery.json',route=>route.fulfill({json:{shows:[]}}));
 const fp=await failed.newPage();await fp.goto(origin);await fp.locator('#public-catalog-message').filter({hasText:'could not be loaded'}).waitFor();
 assert.equal(await fp.locator('#watch').isVisible(),false);assert.equal(await fp.locator('#library').isVisible(),false);
 await fp.evaluate(()=>document.getElementById('standby-play').dispatchEvent(new Event('click')));assert.equal(await fp.locator('#player-host video').count(),0);
 assert.equal(await fp.getByRole('button',{name:'View episodes and sources for Unpublished personal show',exact:true}).count(),0);assert.equal(await fp.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),legacyRaw);await failed.close();
 // Owner loading uses the protected same-origin endpoint, not remote/CORS reads.
 const owner=await context(false);let sharedReads=0,previews=0,confirms=0,lastPreview;
 await owner.route('**/data/published-catalog-manifest.json',()=>{throw Error('Owner must use the protected shared endpoint.');});
 await owner.route('**/api/publisher/*',async route=>{
  const action=new URL(route.request().url()).pathname.split('/').at(-1);
  assert.equal(route.request().method(),'POST');if(action!=='capability')assert.equal(route.request().headers()['x-yata-csrf'],'browser-csrf');
  const body=route.request().postDataJSON();let result;
  if(action==='capability')result={enabled:true,csrfToken:'browser-csrf',baseRevision:master.revision};
  if(action==='shared'){sharedReads++;result={available:true,unchanged:false,...master};}
  if(action==='preview'){previews++;lastPreview=structuredClone(body.catalog);result={reviewId:`review-${previews}`,baseRevision:master.revision,diff:{addedShows:[{id:'reviewed'}]},counts:catalogCounts(body.catalog),expiresAt:new Date(Date.now()+600000).toISOString()};}
  if(action==='confirm'){confirms++;assert.equal(body.reviewId,`review-${previews}`);result={revision:master.revision,counts:catalogCounts(lastPreview),updatedAt:new Date().toISOString(),cacheInvalidationPending:false};}
  await route.fulfill({json:result});
 });
 const op=await owner.newPage();await op.goto(origin);await op.locator('.owner-publisher').getByRole('status').filter({hasText:'local draft is preserved'}).waitFor();
 assert.equal(await op.getByRole('button',{name:'View episodes and sources for Unpublished personal show',exact:true}).count(),1);
 const answers=['Browser-added owner show','scifi'];const answerPrompt=dialog=>dialog.accept(answers.shift());op.on('dialog',answerPrompt);
 await op.getByRole('button',{name:'Add a show',exact:true}).click();await op.locator('#show-title').filter({hasText:'Browser-added owner show'}).waitFor();op.off('dialog',answerPrompt);await op.locator('#close-show').click();
 await op.getByRole('button',{name:'Review publication',exact:true}).click();await op.getByRole('button',{name:'Confirm publication',exact:true}).waitFor({state:'visible'});
 await op.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(node=>node.textContent==='Confirm publication').disabled);
 assert(lastPreview.shows.some(show=>show.id==='unpublished-personal'));assert(lastPreview.shows.some(show=>show.title==='Browser-added owner show'));assert.equal(lastPreview.publishedRevision,undefined);
 await op.locator('#channels button').nth(1).click();await op.waitForFunction(()=>Array.from(document.querySelectorAll('button')).find(node=>node.textContent==='Confirm publication').disabled);
 assert.equal(confirms,0);await op.getByRole('button',{name:'Review publication',exact:true}).click();await op.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(node=>node.textContent==='Confirm publication').disabled);
 await op.getByRole('button',{name:'Confirm publication',exact:true}).click();await op.getByRole('status').filter({hasText:'Catalog published.'}).waitFor();assert.equal(confirms,1);
 op.once('dialog',dialog=>dialog.dismiss());await op.getByRole('button',{name:'Load shared catalog',exact:true}).click();assert.equal(await op.evaluate(key=>JSON.parse(localStorage.getItem(key)).shows.some(show=>show.id==='unpublished-personal'),STORAGE_KEY),true);
 op.once('dialog',dialog=>dialog.accept());await op.getByRole('button',{name:'Load shared catalog',exact:true}).click();await op.getByRole('status').filter({hasText:'Shared catalog loaded.'}).waitFor();
 assert.equal(await op.evaluate(async()=>{const {openBrowserCatalogDatabase}=await import('/src/catalog-database.mjs');const db=await openBrowserCatalogDatabase();const record=await db.read();db.close();return record.catalog.shows.some(show=>show.id==='unpublished-personal');}),false);assert.equal(await op.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),legacyRaw);assert(sharedReads>=2);await owner.close();
 console.log('Passed authoritative startup, preserved legacy draft, independent public tuning/update/failure, and protected owner review/confirm/load.');
}finally{await browser?.close();child.kill();}

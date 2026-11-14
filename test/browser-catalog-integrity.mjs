// Optional browser regression: pass the installed Playwright module URL/path and
// optionally a Chromium executable path. No production services are contacted.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {createSeed, CHANNELS} from '../src/catalog.mjs';
import {STORAGE_KEY} from '../src/domain.mjs';
import {OWNER_DATABASE_NAME} from '../src/catalog-database.mjs';
const {chromium}=await import(process.argv[2] || 'playwright');
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try {
 const [output]=await once(child.stdout,'data');const origin=String(output).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 async function context({publicView=false,noLocks=false}={}) {
  const ctx=await browser.newContext({acceptDownloads:true});
  await ctx.addInitScript(({seed,key,noLocks})=>{
   if (!localStorage.getItem(key)) {localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem('drew-tv.library-revision.v1','browser-regression');localStorage.setItem('yata.commercial-default.v2','1');}
   if(noLocks)Object.defineProperty(globalThis,'indexedDB',{value:undefined});
  },{seed:createSeed(),key:STORAGE_KEY,noLocks});
  await ctx.route('**/api/publisher/*',route=>route.fulfill({status:503,json:{enabled:false,error:'Publishing is unavailable in this mocked test.'}}));
  await ctx.route('**/data/library-manifest.json',route=>route.fulfill({json:{revision:'browser-regression'}}));
  await ctx.route('**/data/*-discovery.json',route=>route.fulfill({json:{shows:[]}}));
  if(publicView){
    const text=JSON.stringify(createSeed()),revision=createHash('sha256').update(text).digest('hex'),seed=createSeed();
    const counts={shows:seed.shows.length,episodes:seed.shows.reduce((n,s)=>n+s.episodes.length,0),sources:seed.shows.reduce((n,s)=>n+s.episodes.reduce((m,e)=>m+e.sources.length,0),0)};
    await ctx.route('**/data/published-catalog-manifest.json',route=>route.fulfill({json:{version:1,revision,catalog:`data/catalogs/${revision}.json`,updatedAt:new Date().toISOString(),counts}}));
    await ctx.route('**/data/catalogs/*.json',route=>route.fulfill({contentType:'application/json',body:text}));
  }
  if(publicView)await ctx.route(origin+'/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<head>','<head><meta name="drew-tv-hosting" content="static">')});});
  return ctx;
 }
 const owner=await context(),a=await owner.newPage(),b=await owner.newPage();
 const errors=[];for(const page of[a,b])page.on('pageerror',error=>errors.push(error.message));
 await Promise.all([a.goto(origin),b.goto(origin)]);
 for(const [page,title]of[[a,'Tab A draft'],[b,'Tab B draft']]) {
  await page.getByRole('button',{name:'View episodes and sources for The Dukes of Hazzard',exact:true}).click();
  await page.getByRole('button',{name:'Edit details / add another source',exact:true}).click();
  await page.locator('#source-title').fill(title);
 }
 await a.evaluate(async name=>{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name);request.onsuccess=()=>resolve(request.result);request.onerror=reject;});
  let released=false;const tx=db.transaction('catalogs','readwrite'),store=tx.objectStore('catalogs');
  function hold(){const request=store.get('main');request.onsuccess=()=>{if(!released)hold();};}hold();
  window.integrityGateHeld=true;window.releaseIntegrityGate=()=>{released=true;};tx.oncomplete=()=>db.close();
 },OWNER_DATABASE_NAME);
 await a.waitForFunction(()=>window.integrityGateHeld);
 await Promise.all([a.locator('#save-source').click(),b.locator('#save-source').click()]);
 await Promise.all([a.waitForFunction(()=>document.querySelector('#save-source').disabled),b.waitForFunction(()=>document.querySelector('#save-source').disabled)]);
 await a.evaluate(()=>window.releaseIntegrityGate());
 await Promise.all([a.waitForFunction(()=>!document.querySelector('#save-source').disabled),b.waitForFunction(()=>!document.querySelector('#save-source').disabled)]);
 await Promise.all([a.waitForFunction(()=>!document.querySelector('#source-dialog').open || document.querySelector('#source-error').textContent.includes('Another tab')),b.waitForFunction(()=>!document.querySelector('#source-dialog').open || document.querySelector('#source-error').textContent.includes('Another tab'))]);
 const state=await a.evaluate(async()=>{const {openBrowserCatalogDatabase}=await import('/src/catalog-database.mjs');const db=await openBrowserCatalogDatabase();const record=await db.read();db.close();return record.catalog;});
 assert(['Tab A draft','Tab B draft'].includes(state.shows[0].episodes[0].title));
 const loser=state.shows[0].episodes[0].title==='Tab A draft'?b:a;
 const draft=await loser.locator('#source-title').inputValue();assert.notEqual(draft,state.shows[0].episodes[0].title);
 assert.equal(await loser.locator('#source-dialog').evaluate(node=>node.open),true);
 assert.match(await loser.locator('#source-error').textContent(),/Another tab saved/);
 const downloadPromise=loser.waitForEvent('download');await loser.getByRole('button',{name:'Export this tab’s catalog',exact:true}).click();
 const download=await downloadPromise;const stream=await download.createReadStream();let json='';for await(const chunk of stream)json+=chunk;
 assert.equal(JSON.parse(json).shows[0].episodes[0].title,draft);
 loser.once('dialog',dialog=>dialog.dismiss());await loser.getByRole('button',{name:'Reload saved catalog',exact:true}).click();
 assert.equal(await loser.locator('#source-title').inputValue(),draft);assert.equal(await loser.locator('#source-dialog').evaluate(node=>node.open),true);
 const failureTab=await owner.newPage();await failureTab.goto(origin);
 await failureTab.getByRole('button',{name:'View episodes and sources for The Dukes of Hazzard',exact:true}).click();await failureTab.getByRole('button',{name:'Edit details / add another source',exact:true}).click();await failureTab.locator('#source-title').fill('Aborted transaction draft');
 await failureTab.evaluate(()=>{const transaction=IDBDatabase.prototype.transaction;let abortNext=true;IDBDatabase.prototype.transaction=function(...args){const tx=transaction.apply(this,args);if(args[1]==='readwrite'&&abortNext){abortNext=false;queueMicrotask(()=>tx.abort());}return tx;};});
 await failureTab.locator('#save-source').click();await failureTab.locator('#source-error').filter({hasText:'transaction failed'}).waitFor();assert.equal(await failureTab.locator('#source-title').inputValue(),'Aborted transaction draft');
 const unchanged=await failureTab.evaluate(async()=>{const {openBrowserCatalogDatabase}=await import('/src/catalog-database.mjs');const db=await openBrowserCatalogDatabase();const record=await db.read();db.close();return record.catalog.shows[0].episodes[0].title;});assert.equal(unchanged,state.shows[0].episodes[0].title);
 assert.deepEqual(errors,[]);await owner.close();
 const viewer=await context({publicView:true}),publicPage=await viewer.newPage();await publicPage.goto(origin);
 await publicPage.waitForFunction(count=>document.querySelectorAll('#channels button').length===count,CHANNELS.length);
 assert.equal(await publicPage.locator('.collection-tools').isVisible(),false);assert.equal(await publicPage.locator('#manage-sources').isVisible(),false);
 await publicPage.evaluate(()=>{for(const id of['bulk-open','seed-all','manage-sources','show-add'])document.getElementById(id).dispatchEvent(new Event('click'));document.getElementById('source-form').dispatchEvent(new Event('submit',{cancelable:true}));});
 assert.equal(await publicPage.locator('#source-dialog').evaluate(node=>node.open),false);assert.equal(await publicPage.locator('#bulk-dialog').evaluate(node=>node.open),false);
 await publicPage.getByRole('button',{name:'View episodes and sources for The Dukes of Hazzard',exact:true}).click();
 assert.equal(await publicPage.getByRole('button',{name:'Remove item',exact:true}).count(),0);assert.equal(await publicPage.getByRole('button',{name:'Remove source',exact:true}).count(),0);
 assert.ok(await publicPage.getByRole('button',{name:'Share episode ↗',exact:true}).count()>=1);
 await publicPage.locator('#close-show').click();await publicPage.locator('#channels button').nth(2).click();
 await publicPage.waitForFunction(()=>document.querySelector('#channel-label').textContent.includes('SCI-FI'));await viewer.close();
 const readonly=await context({noLocks:true}),readPage=await readonly.newPage();await readPage.goto(origin);
 await readPage.locator('#catalog-recovery').waitFor();assert.match(await readPage.locator('#catalog-recovery').textContent(),/read-only/);
 const before=await readPage.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
 await readPage.locator('#channels button').nth(2).click();await readPage.waitForFunction(()=>document.querySelector('#channel-label').textContent.includes('SCI-FI'));
 assert.equal(await readPage.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),before);assert.equal(await readPage.locator('#export-catalog').isEnabled(),true);await readonly.close();
 console.log('Passed real IndexedDB two-tab simultaneous writer conflict, draft export/reload warning, public viewer guards, and safe read-only fallback.');
} finally {await browser?.close();child.kill();}

// Optional browser regression: pass the installed Playwright module URL/path and
// optionally a Chromium executable path. No production services are contacted.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createSeed} from '../src/catalog.mjs';
import {STORAGE_KEY} from '../src/domain.mjs';
import {CATALOG_WRITE_LOCK} from '../src/catalog-store.mjs';
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
   if(noLocks)Object.defineProperty(navigator,'locks',{value:undefined});
  },{seed:createSeed(),key:STORAGE_KEY,noLocks});
  await ctx.route('**/data/library-manifest.json',route=>route.fulfill({json:{revision:'browser-regression'}}));
  await ctx.route('**/data/*-discovery.json',route=>route.fulfill({json:{shows:[]}}));
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
 await a.evaluate(lock=>{navigator.locks.request(lock,{mode:'exclusive'},async()=>{window.integrityGateHeld=true;await new Promise(resolve=>window.releaseIntegrityGate=resolve);});},CATALOG_WRITE_LOCK);
 await a.waitForFunction(()=>window.integrityGateHeld);
 await Promise.all([a.locator('#save-source').click(),b.locator('#save-source').click()]);
 await Promise.all([a.waitForFunction(()=>document.querySelector('#save-source').disabled),b.waitForFunction(()=>document.querySelector('#save-source').disabled)]);
 await a.evaluate(()=>window.releaseIntegrityGate());
 await Promise.all([a.waitForFunction(()=>!document.querySelector('#save-source').disabled),b.waitForFunction(()=>!document.querySelector('#save-source').disabled)]);
 await Promise.all([a.waitForFunction(()=>!document.querySelector('#source-dialog').open || document.querySelector('#source-error').textContent.includes('Another tab')),b.waitForFunction(()=>!document.querySelector('#source-dialog').open || document.querySelector('#source-error').textContent.includes('Another tab'))]);
 const state=await a.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
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
 assert.deepEqual(errors,[]);await owner.close();
 const viewer=await context({publicView:true}),publicPage=await viewer.newPage();await publicPage.goto(origin);
 await publicPage.waitForFunction(()=>document.querySelectorAll('#channels button').length===4);
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
 console.log('Passed real two-tab simultaneous writer conflict, draft export/reload warning, public viewer guards, and safe read-only fallback.');
} finally {await browser?.close();child.kill();}

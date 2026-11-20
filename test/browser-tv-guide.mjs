// Real browser UI with provider stand-ins; no streaming media or AWS writes.
// Arguments: installed Playwright module path, optional Chromium executable.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createHash} from 'node:crypto';
import {createSeed} from '../src/catalog.mjs';import {catalogCounts} from '../src/published-catalog.mjs';
const {chromium}=await import(process.argv[2]||'playwright');
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});let browser;
try{
 const [out]=await once(child.stdout,'data'),origin=String(out).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const timestamp=Date.UTC(2026,10,14,13,15,0),catalog=createSeed();catalog.epoch=timestamp/1000-900;catalog.settings={...catalog.settings,rotation:'ordered',bumpers:false,channel:'action',streamShow:null};
 for(const show of catalog.shows)show.episodes=[];
 function add(showId,id,duration=1200){catalog.shows.find(s=>s.id===showId).episodes.push({id:id.toLowerCase().replaceAll(' ','-'),title:id,season:1,number:1,durationSeconds:duration,kind:'episode',group:'',sources:[{id:id.toLowerCase().replaceAll(' ','-')+'-source',provider:'archive',availability:'verified',url:`https://archive.org/download/guide-fixture/${id}.mp4`}]});}
 add('dukes','Guide Dukes');add('knight-rider','Guide Knight',1800);add('he-man','Guide Cartoon',600);add('midnight-matinee','Guide Film',5400);
 let snapshot=JSON.stringify(catalog),revision=createHash('sha256').update(snapshot).digest('hex');
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 await ctx.addInitScript(({timestamp,settings,epoch,legacy})=>{Date.now=()=>timestamp;window.__guidePlays=[];window.__guideDisposes=0;localStorage.setItem('drew-tv.catalog.v1',legacy);localStorage.setItem('yata.viewer-settings.v1',JSON.stringify({settings,epoch}));},{timestamp,settings:catalog.settings,epoch:catalog.epoch,legacy:JSON.stringify(catalog)});
 await ctx.route(origin+'/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<head>','<head><meta name="drew-tv-hosting" content="static">')});});
 await ctx.route('**/data/published-catalog-v3-manifest.json',r=>r.fulfill({status:404,body:'{}'}));await ctx.route('**/data/published-catalog-v2-manifest.json',route=>route.fulfill({json:{version:1,revision,catalog:`data/catalogs/${revision}.json`,updatedAt:new Date(timestamp).toISOString(),counts:catalogCounts(catalog)}}));
 await ctx.route('**/data/catalogs/*.json',route=>route.fulfill({contentType:'application/json',body:snapshot}));
 await ctx.route('**/src/players.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export function createVideoSession(video,options){window.__guidePlays.push({url:options.url,offset:options.offset});window.__guideEnd=options.onEnd;let paused=false;return{play(){paused=false;},pause(){paused=true;},getState(){return{ready:true,currentTime:options.offset,duration:1200,paused,volume:1,muted:false}},seek(){return true},setVolume(){},setMuted(){},dispose(){window.__guideDisposes++;}};}export function createYouTubeSession(){throw Error('Unexpected YouTube source')}`}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
 await page.goto(origin+'/#guide');await page.locator('.tv-guide-row').first().waitFor({timeout:10000}).catch(async error=>{console.error((await page.locator('body').innerText()).slice(0,2500));throw error;});assert.equal(await page.locator('.tv-guide-row').count(),9);
 assert.equal(await page.locator('#guide').isVisible(),true);assert.equal(await page.locator('#library').isVisible(),false);
 assert.equal(await page.locator('footer .legacy-recovery').count(),1);assert.equal(await page.locator('main .legacy-recovery').count(),0);assert.equal(await page.locator('.legacy-recovery').evaluate(e=>e.open),false);
 assert.equal(await page.locator('#stream-settings').evaluate(e=>e.open),false);
 const playerBox=await page.locator('#player-shell').boundingBox(),guideBox=await page.locator('#guide').boundingBox();
 assert.ok(playerBox.x<guideBox.x);assert.ok(playerBox.width<410);assert.ok(playerBox.y>=0&&playerBox.y<1000);
 await page.locator('#open-stream-settings').click();assert.equal(await page.locator('#stream-settings').evaluate(e=>e.matches(':modal')),true);assert.equal(await page.locator('#stream-rotation').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#stream-settings').evaluate(e=>e.open),false);

 assert.equal(await page.locator('.tv-guide-program').filter({hasText:'Guide Film'}).count(),0);
 assert.ok(await page.getByText('No checked, schedulable episodes yet.',{exact:false}).count());
 const actionRow=page.locator('.tv-guide-row').filter({has:page.locator('strong',{hasText:'Action Adventure'})});
 await actionRow.locator('.tv-guide-program').filter({hasText:'Guide Knight'}).first().click();
 assert.equal(await page.locator('[data-guide-show]').textContent(),'Knight Rider');
 assert.match(await page.locator('[data-guide-tune]').textContent(),/Join live: The Dukes of Hazzard — Guide Dukes/);
 assert.match(await page.locator('[data-guide-live-note]').textContent(),/Joins what is playing now/);

 await page.locator('[data-guide-play]').click();await page.waitForFunction(()=>window.__guidePlays.length===1);
 assert.deepEqual(await page.evaluate(()=>window.__guidePlays[0]),{url:'https://archive.org/download/guide-fixture/Guide%20Knight.mp4',offset:0});
 // Selection starts in its station occurrence, so next wraps to the first program.
 await page.locator('#skip').click();await page.waitForFunction(()=>window.__guidePlays.length===2);
 assert.ok((await page.evaluate(()=>window.__guidePlays[1].url)).includes('Guide%20Dukes'));
 await page.evaluate(()=>{window.keptVideo=document.querySelector('#player-host video');});
 const before=await page.evaluate(()=>window.__guideDisposes);
 await page.locator('#library-tab').click();await page.locator('#guide-tab').click();
 assert.equal(await page.evaluate(()=>window.keptVideo===document.querySelector('#player-host video')),true);
 assert.equal(await page.evaluate(()=>window.__guideDisposes),before);
 await page.locator('#open-stream-settings').click();assert.equal(await page.locator('#stream-settings').evaluate(e=>e.matches(':modal')),true);await page.locator('#crt-look').check();await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.keptVideo===document.querySelector('#player-host video')),true);assert.equal(await page.evaluate(()=>window.__guideDisposes),before);assert.equal(await page.evaluate(()=>document.activeElement.id),'open-stream-settings');

 await page.locator('#fill-window').click();assert.equal(await page.locator('#screen-column').evaluate(e=>getComputedStyle(e).position),'fixed');
 const expanded=await page.locator('#screen-column').boundingBox();assert.ok(expanded.width>=1439&&expanded.height>=999);
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.keptVideo===document.querySelector('#player-host video')),true);

 await actionRow.locator('.tv-guide-program').filter({hasText:'Guide Knight'}).first().click();
 await page.locator('[data-guide-tune]').click();await page.waitForFunction(()=>window.__guidePlays.length===3);
 const live=await page.evaluate(()=>window.__guidePlays[2]);assert.ok(live.url.includes('Guide%20Dukes'));assert.equal(live.offset,900);
 await page.locator('[data-guide-later]').click();const title=await page.locator('[data-guide-date]').textContent();assert.ok(title);
 await page.locator('[data-guide-reset]').click();
 // An updated published master replaces guide definitions without replacing playback.
 await page.evaluate(()=>{window.keptVideo=document.querySelector('#player-host video');});
 catalog.shows.find(s=>s.id==='knight-rider').episodes[0].title='Guide Knight updated';snapshot=JSON.stringify(catalog);revision=createHash('sha256').update(snapshot).digest('hex');
 await page.locator('#library-tab').click();await page.getByRole('button',{name:'Refresh shared catalog',exact:true}).click();await page.locator('#guide-tab').click();
 await page.locator('.tv-guide-program').filter({hasText:'Guide Knight updated'}).first().waitFor();
 assert.equal(await page.evaluate(()=>window.keptVideo===document.querySelector('#player-host video')),true);
 await page.setViewportSize({width:390,height:844});
 await page.locator('#fill-window').click();const mobileExpanded=await page.locator('#screen-column').boundingBox();assert.ok(mobileExpanded.width>=389&&mobileExpanded.height>=843);await page.keyboard.press('Escape');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#guide-tab').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#library-tab').getAttribute('aria-selected'),'true');
 assert.deepEqual(errors,[]);
 console.log('Passed guide schedules, selection, episode/queue playback, live offset, retained player, master refresh, keyboard tabs and mobile width.');
}finally{await browser?.close();child.kill();}

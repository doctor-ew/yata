import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.argv[2]||'playwright');
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try {
 const [out]=await once(child.stdout,'data'),origin=String(out).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin);await page.locator('#open-stream-settings').waitFor();
 await page.evaluate(async()=>{document.documentElement.classList.add('native-app');const {mountMobileNavigation}=await import('/mobile/navigation.mjs');mountMobileNavigation({android:true,report:console.error,actions:{}});const {mountTvNavigation}=await import('/mobile/tv-navigation.mjs');mountTvNavigation();});
 await page.addStyleTag({url:origin+'/mobile/tv.css'});
 await page.locator('#native-navigation a[data-view="library"]').focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.documentElement.dataset.nativeView==='library');assert.equal(await page.locator('#library').isVisible(),true);
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.dataset.view),'guide');await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.documentElement.dataset.nativeView==='guide');assert.equal(await page.locator('#guide').isVisible(),true);
 await page.locator('#native-more-button').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#native-more').evaluate(e=>e.open),true);
 for(let i=0;i<8;i++) {await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('#native-more'))),true);}
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'native-more-button');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.documentElement.dataset.nativeView==='watch');
 await page.locator('#native-navigation a[data-view="watch"]').focus();
 for(let i=0;i<20;i++) {await page.keyboard.press(i%2?'ArrowLeft':'ArrowUp');assert.equal(await page.evaluate(()=>document.activeElement!==document.body),true);}
 await page.screenshot({path:'/private/tmp/yata-tv-shell.png'});
 console.log('Actual shared app shell: TV Watch/Guide/Library routing, More modal focus/Back return and directional navigation passed (external network blocked; no playback claim).');
} finally {await browser?.close();child.kill();}

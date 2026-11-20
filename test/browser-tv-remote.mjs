// Focus behavior in Chromium; no native-device or streaming claim.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {chromium}=await import(process.argv[2]||'playwright');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.setContent(`<style>button,input,select{position:absolute;width:120px;height:50px}#a{left:20px;top:20px}#b{left:170px;top:20px}#c{left:20px;top:100px}#search{left:170px;top:100px}dialog button{position:static}#hidden{display:none}#offscreen{top:1100px;left:20px}</style><button id=a>A</button><button id=b>B</button><button id=c>Dialog</button><input id=search><button id=hidden>Hidden</button><button disabled>Disabled</button><button id=offscreen>Below</button><dialog id=dialog><button id=done>Done</button></dialog>`);
 await page.evaluate(()=>{document.querySelector('#c').onclick=()=>document.querySelector('dialog').showModal();document.querySelector('#done').onclick=()=>document.querySelector('dialog').close();});
 const source=await readFile(new URL('../mobile/tv-navigation.mjs',import.meta.url),'utf8');
 await page.addScriptTag({type:'module',content:source+'\nmountTvNavigation();'});
 await page.waitForFunction(()=>document.activeElement.id==='a');
 await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'b');
 await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'search');
 await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.id),'c');
 await page.keyboard.press('Enter');assert.equal(await page.locator('dialog').evaluate(e=>e.open),true);
 await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'done');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'c');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.keyboard.type('hello');await page.keyboard.press('ArrowLeft');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'search');assert.equal(await page.locator('#search').inputValue(),'hello');
 await page.keyboard.press('Escape');await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.id),'c');
 await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.id),'offscreen');assert.ok(await page.evaluate(()=>scrollY)>0);
 await page.evaluate(()=>document.querySelector('#offscreen').remove());await page.waitForFunction(()=>document.activeElement.id!=='');
 // Phone document never loads the opt-in module.
 const phone=await browser.newPage();await phone.setContent('<button>Phone</button>');assert.equal(await phone.locator('html').evaluate(e=>e.classList.contains('yata-tv')),false);
 console.log('TV remote browser checks passed: directional focus, hidden/disabled exclusion, modal containment/return, input editing, scrolling and removed-control recovery.');
} finally {await browser.close();}

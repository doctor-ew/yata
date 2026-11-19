// Browser regression: channel commands and prompted follow-ups use the planner.
// Requests and playback are stand-ins; no paid AI calls or provider media.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.argv[2]||'playwright');
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 const [out]=await once(child.stdout,'data'),origin=String(out).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
 browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const page=await browser.newPage();
 await page.route('**/channel-regression',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><head><link rel="stylesheet" href="/buddy.css"></head><body></body>'}));
 await page.goto(origin+'/channel-regression');
 await page.evaluate(async()=>{
  const {mountBuddy}=await import('/src/buddy-ui.mjs');
  const names=['Knight Rider','G.I. Joe: A Real American Hero','The Transformers','The Greatest American Hero'];
  const shows=Array.from({length:259},(_,i)=>({id:'show-'+i,title:names[i]||'Fixture Show '+i,channel:'action',episodes:[{id:'episode-'+i,title:'Fixture episode',kind:'episode',durationSeconds:1200,group:'',season:1,number:1,sources:[{id:'source-'+i,provider:'archive',availability:'verified',url:'https://archive.org/download/channel-fixture/episode.mp4'}]}]}));
  window.calls={plans:[],chats:[],watch:[]};window.invalid=false;
  mountBuddy({getCatalog:()=>({shows,settings:{}}),onWatch:async(ids,title)=>{calls.watch.push({ids,title});return true;},requestPlan:async r=>{calls.plans.push(r);return{host:r.host,title:'Requested mix',intro:'Your requested mix is ready.',showIds:window.invalid?['unknown']:shows.slice(0,4).map(s=>s.id)};},requestChat:async r=>{calls.chats.push(r);return{answer:'Ordinary conversation.'};}});
 });
 await page.locator('.buddy-avatar').click();
 const send=async text=>{await page.locator('#buddy-question').fill(text);await page.locator('#buddy-question').press('Enter');await page.waitForFunction(()=>!document.querySelector('.buddy-chat button').disabled);};
 await send('please make a channel of knight rider, GI joe, transformers, greatest american hero');
 assert.equal(await page.evaluate(()=>calls.plans.length),1);assert.equal(await page.evaluate(()=>calls.chats.length),0);assert.equal(await page.evaluate(()=>JSON.parse(calls.plans[0].shows).length),259);assert.equal(await page.evaluate(()=>calls.watch[0].ids.length),4);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('cartoons and action');assert.equal(await page.evaluate(()=>calls.plans.length),2);
 await send('make me a channel');assert.equal(await page.evaluate(()=>calls.plans.length),2);await send('Knight Rider, Transformers');assert.equal(await page.evaluate(()=>calls.plans.length),3);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('cancel');await send('Thanks for helping');assert.equal(await page.evaluate(()=>calls.chats.length),1);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('report a bug in playback');assert.equal(await page.evaluate(()=>calls.plans.length),3);assert.match(await page.locator('.buddy-conversation').innerText(),/draft a GitHub issue/);
 await page.locator('#buddy-panel').evaluate(x=>x.close());await page.locator('.buddy-avatar').click();
 // Cancel feedback, then a malformed plan must not save a channel.
 await send('cancel');await page.evaluate(()=>window.invalid=true);await send('build a channel with cartoons');assert.equal(await page.evaluate(()=>calls.watch.length),3);assert.match(await page.locator('.buddy-status').innerText(),/no longer matches/);
 console.log({explicitChannel:true,promptedFollowup:true,currentOffer259:true,cancelAndFeedbackPreserved:true,unknownIdsRejected:true});
}finally{await browser?.close();child.kill('SIGTERM');}

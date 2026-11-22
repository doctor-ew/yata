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
  window.calls={plans:[],chats:[],watch:[],intents:[]};window.invalid=false;window.intentUncertain=false;window.catalogReady=true;
  mountBuddy({isReady:()=>window.catalogReady,getCatalog:()=>({shows,settings:{}}),onWatch:async(ids,title)=>{calls.watch.push({ids,title});return true;},requestFeedback:async()=>({version:1,status:'assessed',kind:'bug',next:'actual',confidence:.99}),requestIntent:async r=>{calls.intents.push(r);return{version:1,status:window.intentUncertain?'clarify':'classified',intent:window.intentUncertain?'clarify':r.question.startsWith("Let's")?'build-channel':'conversation',confidence:.98};},requestPlan:async r=>{calls.plans.push(r);return{host:r.host,title:'Requested mix',intro:'Your requested mix is ready.',showIds:window.invalid?['unknown']:shows.slice(0,4).map(s=>s.id)};},requestChat:async r=>{calls.chats.push(r);return{answer:'Ordinary conversation.'};}});
 });
 await page.locator('.buddy-avatar').click();
 const send=async(text,accept=true)=>{await page.locator('#buddy-question').fill(text);await page.locator('#buddy-question').press('Enter');await page.waitForFunction(()=>!document.querySelector('.buddy-chat button').disabled);const save=page.getByRole('button',{name:'Save & play this lineup',exact:true});if(accept&&await save.count())await save.click();};
 // A missing-title list produces a review, never an automatic replacement.
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();
 await send('Legend of Zelda animated series, Galaxy High, Gravedale High, CBS Storybreak, COPS animated series',false);
 assert.equal(await page.evaluate(()=>calls.watch.length),0);assert.match(await page.locator('.buddy-conversation').innerText(),/couldn’t match.*Legend of Zelda/s);
 await page.getByRole('button',{name:'Keep my current channel',exact:true}).click();assert.equal(await page.evaluate(()=>calls.watch.length),0);
 await page.evaluate(()=>calls.plans=[]);
 // Feedback opens above the companion with a visible, focused field.
 await page.getByRole('button',{name:'Requests & bugs',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'buddy-question');await page.getByRole('button',{name:'Use a form',exact:true}).click();
 const feedback=page.locator('#feedback-panel');assert(await feedback.evaluate(e=>e.matches(':modal')));assert.equal(await page.evaluate(()=>document.activeElement.name),'summary');
 await page.setViewportSize({width:390,height:844});assert(await feedback.isVisible());assert(await feedback.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&[...e.querySelectorAll('input,textarea,select')].every(f=>{const b=f.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right;});}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/yata-feedback-phone.png'});await feedback.locator('[name=summary]').fill('Feedback input is visible');await feedback.locator('[name=details]').fill('This is a test draft; do not post.');await feedback.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Use a form',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.name),'summary');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Cancel report',exact:true}).click();
 await send('please make a channel of knight rider, GI joe, transformers, greatest american hero');
 assert.equal(await page.evaluate(()=>calls.plans.length),1);assert.equal(await page.evaluate(()=>calls.chats.length),0);assert.equal(await page.evaluate(()=>JSON.parse(calls.plans[0].shows).length),259);assert.equal(await page.evaluate(()=>calls.watch[0].ids.length),4);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('cartoons and action');assert.equal(await page.evaluate(()=>calls.plans.length),2);
 await send('make me a channel');assert.equal(await page.evaluate(()=>calls.plans.length),2);await send('Knight Rider, Transformers');assert.equal(await page.evaluate(()=>calls.plans.length),3);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('cancel');await send('Thanks for helping');assert.equal(await page.evaluate(()=>calls.chats.length),1);
 await page.getByRole('button',{name:'Make me a channel',exact:true}).click();await send('report a bug in playback');assert.equal(await page.evaluate(()=>calls.plans.length),3);assert.match(await page.locator('.buddy-conversation').innerText(),/What happened after that/);
 await page.locator('#buddy-panel').evaluate(x=>x.close());await page.locator('.buddy-avatar').click();
 // Cancel feedback, then a malformed plan must not save a channel.
 await send('cancel');await page.evaluate(()=>window.invalid=true);await send('build a channel with cartoons');assert.equal(await page.evaluate(()=>calls.watch.length),3);assert.match(await page.locator('.buddy-status').innerText(),/no longer matches/);
 await page.evaluate(()=>window.invalid=false);await send("Let's create a channel with He-Man, Battlestar Galactica, and transformers");assert.equal(await page.evaluate(()=>calls.intents.at(-1).question),"Let's create a channel with He-Man, Battlestar Galactica, and transformers");assert.equal(await page.evaluate(()=>calls.watch.length),4);
 await page.evaluate(()=>window.intentUncertain=true);await send('perhaps something different');assert.equal(await page.evaluate(()=>calls.watch.length),4);await page.getByRole('button',{name:'Just chat',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.buddy-chat button').disabled);assert.equal(await page.evaluate(()=>calls.watch.length),4);
 await page.evaluate(()=>{window.intentUncertain=false;window.catalogReady=false;});await send("Let's make a different mix");assert.equal(await page.evaluate(()=>calls.watch.length),4);assert.match(await page.locator('.buddy-status').innerText(),/catalog is still loading/);await page.evaluate(()=>window.catalogReady=true);
 const settings=page.locator('.buddy-settings');await settings.locator('summary').click();const names=await page.locator('#buddy-character option').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true})));await page.locator('#buddy-search').fill('Twiki');assert.equal(await page.locator('#buddy-character option:not([disabled])').count(),1);assert.match(await page.locator('#buddy-character').innerText(),/Twiki/);await page.locator('#buddy-character').selectOption('twiki');await page.waitForFunction(()=>document.querySelector('#buddy-title').textContent==='Twiki');
 console.log({semanticLetsCreate:true,uncertaintyNeverAutoplays:true,sortedSearchableCompanions:true,explicitChannel:true,promptedFollowup:true,currentOffer259:true,cancelAndFeedbackPreserved:true,unknownIdsRejected:true});
}finally{await browser?.close();child.kill('SIGTERM');}

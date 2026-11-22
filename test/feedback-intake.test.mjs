import test from'node:test';import assert from'node:assert/strict';
import{validateFeedbackReport,normalizeFeedbackAssessment,feedbackDraft}from'../src/feedback-intake.mjs';
import{createBuddyFeedback}from'../src/channel-ai.mjs';
const report={version:1,messages:[{text:'Create a bug about the bug feature not sending',answerTo:null},{text:'I clicked Review on GitHub and nothing happened.',answerTo:'actual'}]};
test('feedback preserves supplied wording and only feedback-specific context',()=>{
 assert.deepEqual(validateFeedbackReport(report),report);const draft=feedbackDraft(report,'bug');assert.equal(draft.summary,report.messages[0].text);assert.match(draft.details,/I clicked Review on GitHub and nothing happened/);assert.doesNotMatch(draft.details,/Chrome|Android|diagnosis/);
 for(const value of [{...report,history:[]},{version:1,messages:[{text:'x',answerTo:'execute'}]},{version:1,messages:[{text:'x'.repeat(1001),answerTo:null}]},{version:1,messages:Array.from({length:3},()=>({text:'x'.repeat(900),answerTo:null}))}])assert.throws(()=>validateFeedbackReport(value));
});
test('feedback model output is finite data and cannot supply report text or destinations',()=>{
 const good={version:1,status:'assessed',kind:'bug',next:'actual',confidence:.98};assert.deepEqual(normalizeFeedbackAssessment(good),good);
 for(const patch of [{next:'https://evil.example'},{summary:'invented'},{confidence:.5},{status:'unavailable'},{kind:'__proto__'}])assert.throws(()=>normalizeFeedbackAssessment({...good,...patch}));
 assert.equal(normalizeFeedbackAssessment({version:1,status:'unavailable',kind:'other',next:'clarify',confidence:0}).next,'clarify');
});
test('feedback assessment uses verified session, explicit mode and no automatic retry',async()=>{
 let calls=[];const call=createBuddyFeedback({sitekey:'fixture',verify:async()=> 'fixture',fetcher:async(url,options)=>{calls.push(JSON.parse(options.body));return{ok:true,json:async()=>url.endsWith('/session')?{sessionToken:'grant',expiresAt:Date.now()/1000+1800}:{assessment:{version:1,status:'assessed',kind:'bug',next:'ready',confidence:.98}}};}});
 const value=await call({question:JSON.stringify(report),personality:'twiki'},new AbortController().signal);assert.equal(value.next,'ready');assert.equal(calls.length,2);assert.equal(calls[1].mode,'feedback');assert.equal(calls[1].sessionToken,'grant');assert.deepEqual(JSON.parse(calls[1].question),report);
});

export const FEEDBACK_KINDS=Object.freeze(['bug','feature','channel','content','other']);
export const FEEDBACK_QUESTIONS=Object.freeze({
 description:'What feature is involved, and what problem or change would you like to report?',
 action:'What did you click or try just before the problem happened?',
 actual:'What happened after that—did a draft open, did you see an error, or did nothing happen?',
 desired:'What would you like the app to do differently?',
});
const keys=(value,allowed)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===allowed.length&&Object.keys(value).every(k=>allowed.includes(k));
export function validateFeedbackReport(value){
 if(!keys(value,['version','messages'])||value.version!==1||!Array.isArray(value.messages)||!value.messages.length||value.messages.length>6)throw Error('Invalid feedback report.');
 let total=0;for(const m of value.messages){if(!keys(m,['text','answerTo'])||typeof m.text!=='string'||!m.text.trim()||m.text.length>1000||/[\x00-\x08\x0b-\x1f]/.test(m.text)||(m.answerTo!==null&&(typeof m.answerTo!=='string'||!Object.hasOwn(FEEDBACK_QUESTIONS,m.answerTo))))throw Error('Invalid feedback message.');total+=m.text.length;}
 if(total>2400||JSON.stringify(value).length>4000||new TextEncoder().encode(JSON.stringify(value)).length>12000)throw Error('This report is getting long. Use the editable form to keep all the details.');
 return {version:1,messages:value.messages.map(m=>({text:m.text,answerTo:m.answerTo}))};
}
export function normalizeFeedbackAssessment(value){
 if(!keys(value,['version','status','kind','next','confidence'])||value.version!==1||!['assessed','clarify','unavailable'].includes(value.status)||!FEEDBACK_KINDS.includes(value.kind)||![...Object.keys(FEEDBACK_QUESTIONS),'ready','clarify'].includes(value.next)||typeof value.confidence!=='number'||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||(value.status==='assessed'?(value.next==='clarify'||value.confidence<.85):(value.kind!=='other'||value.next!=='clarify'||value.confidence!==0)))throw Error('Invalid feedback assessment.');
 return {...value};
}
export function feedbackDraft(report,kind='other'){
 const valid=validateFeedbackReport(report);
 return {kind:FEEDBACK_KINDS.includes(kind)?kind:'other',summary:valid.messages[0].text.trim().slice(0,120),details:valid.messages.map(m=>m.answerTo?`${FEEDBACK_QUESTIONS[m.answerTo]}\n${m.text}`:m.text).join('\n\n')};
}

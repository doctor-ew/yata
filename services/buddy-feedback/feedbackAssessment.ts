import {LambdaClient, InvokeCommand} from '@aws-sdk/client-lambda';

export const FEEDBACK_KINDS = ['bug','feature','channel','content','other'] as const;
export const FEEDBACK_STEPS = ['description','action','actual','desired','ready','clarify'] as const;
export interface FeedbackReport {version:1;messages:{text:string;answerTo:null|'description'|'action'|'actual'|'desired'}[];}
export interface FeedbackAssessment {version:1;status:'assessed'|'clarify'|'unavailable';kind:typeof FEEDBACK_KINDS[number];next:typeof FEEDBACK_STEPS[number];confidence:number;}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&Object.keys(v).every(k=>names.includes(k));
export const feedbackUnavailable=():FeedbackAssessment=>({version:1,status:'unavailable',kind:'other',next:'clarify',confidence:0});
export function parseFeedbackReport(query:string):FeedbackReport{
 if(typeof query!=='string'||query.length>4000||Buffer.byteLength(query,'utf8')>12000)throw Error('Invalid feedback request');
 const value:unknown=JSON.parse(query);
 if(!record(value)||!exact(value,['version','messages'])||value.version!==1||!Array.isArray(value.messages)||!value.messages.length||value.messages.length>6)throw Error('Invalid feedback report');
 let total=0;
 for(const m of value.messages){
  if(!record(m)||!exact(m,['text','answerTo'])||typeof m.text!=='string'||!m.text.trim()||m.text.length>1000||/[\x00-\x08\x0b-\x1f]/.test(m.text)||(m.answerTo!==null&&!(['description','action','actual','desired'] as unknown[]).includes(m.answerTo)))throw Error('Invalid feedback message');
  total+=m.text.length;
 }
 if(total>2400)throw Error('Feedback report too large');
 return value as unknown as FeedbackReport;
}
export function validateFeedbackAssessment(value:unknown):FeedbackAssessment{
 if(!record(value)||!exact(value,['version','status','kind','next','confidence'])||value.version!==1||!['assessed','clarify','unavailable'].includes(value.status as string)||!(FEEDBACK_KINDS as readonly unknown[]).includes(value.kind)||!(FEEDBACK_STEPS as readonly unknown[]).includes(value.next)||typeof value.confidence!=='number'||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||(value.status==='assessed'?(value.next==='clarify'||value.confidence<.85):(value.kind!=='other'||value.next!=='clarify'||value.confidence!==0)))throw Error('Invalid feedback assessment');
 return value as unknown as FeedbackAssessment;
}
let client:LambdaClient|undefined;
export async function assessFeedback(query:string,invoke?:(report:FeedbackReport)=>Promise<unknown>,timeoutMs=12000):Promise<FeedbackAssessment>{
 try{
  const report=parseFeedbackReport(query);let value:unknown;
  if(invoke)value=await invoke(report);
  else{
   const name=process.env.EPISODE_RETRIEVAL_FUNCTION;if(!name)return feedbackUnavailable();
   client=client||new LambdaClient({region:process.env.AWS_REGION||'us-east-1',maxAttempts:1});
   const response=await client.send(new InvokeCommand({FunctionName:name,InvocationType:'RequestResponse',Payload:Buffer.from(JSON.stringify({operation:'feedback',report}))}),{abortSignal:AbortSignal.timeout(Math.max(1,Math.min(12000,timeoutMs)))});
   if(response.FunctionError||response.StatusCode!==200||!response.Payload||response.Payload.length>2000)throw Error('Feedback unavailable');
   value=JSON.parse(Buffer.from(response.Payload).toString('utf8'));
  }
  return validateFeedbackAssessment(value);
 }catch{return feedbackUnavailable();}
}

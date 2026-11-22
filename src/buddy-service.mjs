import{validateFeedbackReport}from'./feedback-intake.mjs';
import{initializeBuddyRoster,refreshBuddyRoster}from'./buddy-registry.mjs';
import{createBuddyConversation,createChannelAi,createBuddyIntent,createBuddyFeedback}from'./channel-ai.mjs';
import{BUDDY_PERSONAS}from'./buddy-personas.mjs';
initializeBuddyRoster();await refreshBuddyRoster();
const nonce=location.hash.slice(1),origins=new Set(['https://localhost','capacitor://localhost']),hosts=new Set(BUDDY_PERSONAS.map(p=>p.id));
let used=false;
if(window.parent!==window&&/^[a-f0-9]{32}$/.test(nonce)){
 window.addEventListener('message',async event=>{
  if(used||event.source!==parent||!origins.has(event.origin)||event.data?.nonce!==nonce||event.data.type!=='request')return;
  const {mode,request}=event.data;
  if(!['buddy','channel','intent','feedback'].includes(mode)||!request||typeof request.question!=='string'||request.question.length>(['buddy','feedback'].includes(mode)?4000:1000))return;
  if(!hosts.has(mode==='channel'?request.host:request.personality)){used=true;parent.postMessage({nonce,type:'error',code:'roster-refresh'},event.origin);return;}
  if(mode==='feedback'){try{validateFeedbackReport(JSON.parse(request.question));}catch{return;}}
  if(mode==='buddy'&&request.retrievalQuery!==undefined&&(typeof request.retrievalQuery!=='string'||!request.retrievalQuery.trim()||request.retrievalQuery.length>300))return;
  if(mode==='channel'&&(typeof request.shows!=='string'||request.shows.length>100000))return;
  used=true;const reply=data=>parent.postMessage({...data,nonce},event.origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);
  try{
   const options={sitekey:'0x4AAAAAAGAVS3ojZLogR3TI',container:'#verification'};
   const call=mode==='buddy'?createBuddyConversation(options):mode==='intent'?createBuddyIntent(options):mode==='feedback'?createBuddyFeedback(options):createChannelAi(options);
   const body=mode!=='channel'?{question:request.question,personality:request.personality,...(request.retrievalQuery?{retrievalQuery:request.retrievalQuery}:{})}:{question:request.question,host:request.host,shows:request.shows};
   const value=await call(body,controller.signal,text=>{document.querySelector('#status').textContent=text;reply({type:'phase',text});});reply({type:'result',value});
  }catch{reply({type:'error'});}finally{clearTimeout(timer);}
 });
 parent.postMessage({type:'ready',nonce},'*');
}

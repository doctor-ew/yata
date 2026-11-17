import{createBuddyConversation,createChannelAi}from'./channel-ai.mjs';
import{BUDDY_PERSONAS}from'./buddy-personas.mjs';
const nonce=location.hash.slice(1),origins=new Set(['https://localhost','capacitor://localhost']),hosts=new Set(BUDDY_PERSONAS.map(p=>p.id));
let used=false;
if(window.parent!==window&&/^[a-f0-9]{32}$/.test(nonce)){
 window.addEventListener('message',async event=>{
  if(used||event.source!==parent||!origins.has(event.origin)||event.data?.nonce!==nonce||event.data.type!=='request')return;
  const {mode,request}=event.data;
  if(!['buddy','channel'].includes(mode)||!request||typeof request.question!=='string'||request.question.length>(mode==='buddy'?4000:1000)||!hosts.has(mode==='buddy'?request.personality:request.host))return;
  if(mode==='buddy'&&request.retrievalQuery!==undefined&&(typeof request.retrievalQuery!=='string'||!request.retrievalQuery.trim()||request.retrievalQuery.length>300))return;
  if(mode==='channel'&&(typeof request.shows!=='string'||request.shows.length>100000))return;
  used=true;const reply=data=>parent.postMessage({...data,nonce},event.origin),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);
  try{
   const options={sitekey:'0x4AAAAAAGAVS3ojZLogR3TI',container:'#verification'};
   const call=mode==='buddy'?createBuddyConversation(options):createChannelAi(options);
   const body=mode==='buddy'?{question:request.question,personality:request.personality,...(request.retrievalQuery?{retrievalQuery:request.retrievalQuery}:{})}:{question:request.question,host:request.host,shows:request.shows};
   const value=await call(body,controller.signal,text=>{document.querySelector('#status').textContent=text;reply({type:'phase',text});});reply({type:'result',value});
  }catch{reply({type:'error'});}finally{clearTimeout(timer);}
 });
 parent.postMessage({type:'ready',nonce},'*');
}

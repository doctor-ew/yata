import{normalizeBuddyReply}from'./buddy-reply.mjs';
import{normalizeBuddyConversation}from'./buddy-evidence.mjs';
import{getAnalytics}from'./analytics.mjs';
// The public widget key is supplied in HTML. Session grants stay in memory.
const base='https://skippyts.doctorew.com';
let loading;
function loadTurnstile() {
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const timer=setTimeout(fail,15000);
    function fail(){clearTimeout(timer);script.remove();loading=null;reject(Error('Browser verification could not load. Try again.'));}
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(window.turnstile)resolve(window.turnstile);else fail();};document.head.append(script);
  });return loading;
}
export async function challenge(sitekey,container,signal) {
  if(!sitekey)throw Error('Channel building is unavailable while verification is configured.');
  const api=await loadTurnstile();if(signal.aborted)throw Error('Request cancelled.');
  return new Promise((resolve,reject)=>{
    let widget,done=false;
    function finish(token){if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(widget!==undefined)api.remove(widget);token?resolve(token):reject(Error('Browser verification did not complete. Try again.'));}
    const abort=()=>finish(),timer=setTimeout(abort,90000);signal.addEventListener('abort',abort,{once:true});
    try {widget=api.render(container,{sitekey,action:'page',execution:'execute',appearance:'interaction-only','response-field':false,callback:finish,'error-callback':abort,'expired-callback':abort,'timeout-callback':abort});if(!done)api.execute(container);else api.remove(widget);}catch{finish();}
  });
}
export function createChannelAi({sitekey,container,fetcher=fetch,verify=challenge,mode='channel',responseKey='plan',structured=false}={}) {
  let grant=null;
  async function post(path,body,signal){const response=await fetcher(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});let result;try{result=await response.json();}catch{throw Error('The host could not be reached. Try again.');}if(!response.ok){if(response.status===401)grant=null;throw Error(typeof result.error==='string'?result.error:'The host could not finish. Try again.');}return result;}
  return async (request,signal,onPhase=()=>{})=>{
    const analytics=getAnalytics(),dimensions={host:request.host||request.personality||'none'};analytics.record('ai_attempt',dimensions);
    try{
    if(!grant||grant.expiresAt*1000<Date.now()+30000){onPhase('Checking this browser…');const turnstileToken=await verify(sitekey,container,signal);grant=await post('/session',{turnstileToken},signal);if(typeof grant.sessionToken!=='string'||!Number.isFinite(grant.expiresAt)){grant=null;throw Error('Invalid browser verification. Try again.');}}
    if(signal.aborted)throw Error('Request cancelled.');onPhase(mode==='channel'?'The programming department is arguing over your lineup…':'Your buddy is thinking…');
    const envelope=await post('/chatbot',{...request,...(['channel','buddy','intent','feedback'].includes(mode)?{mode}:{}),sessionToken:grant.sessionToken},signal);
    const result=structured?envelope:envelope[responseKey];
    if(result===undefined||result===null||(responseKey==='answer'&&!structured&&(typeof result!=='string'||!result.trim()||result.length>12000)))throw Error('The host sent an unreadable reply. Try again.');
    analytics.record('ai_success',dimensions);return result;
    }catch(error){analytics.record(signal.aborted?'ai_cancel':'ai_failure',dimensions);throw error;}
  };
}

export function createBuddyChat(options={}){const request=createChannelAi({...options,mode:'buddy',responseKey:'answer'});return async(...args)=>{const answer=normalizeBuddyReply(await request(...args));if(typeof answer!=='string'||!answer.trim()||answer.length>12000)throw Error('Your buddy sent an unreadable reply. Try again.');return answer;};}
export function createBuddyConversation(options={}){const request=createChannelAi({...options,mode: "buddy",responseKey: "answer",structured:true});return async(...args)=>normalizeBuddyConversation(await request(...args));}

export function createBuddyIntent(options={}){return createChannelAi({...options,mode:'intent',responseKey:'route'});}

export function createBuddyFeedback(options={}){return createChannelAi({...options,mode:'feedback',responseKey:'assessment'});}

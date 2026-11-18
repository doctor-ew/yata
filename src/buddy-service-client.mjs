// Native requests run in the verified website origin; grants never leave it.
export function requestEmbeddedBuddy(mode,container,request,signal,onPhase=()=>{}){
 if(!['buddy','channel'].includes(mode))return Promise.reject(Error('Unknown buddy request.'));
 return new Promise((resolve,reject)=>{
  const frame=document.createElement('iframe'),nonce=crypto.randomUUID().replaceAll('-','');let done=false,sent=false;
  frame.title='Verify your buddy request';frame.src='https://doctorew.com/tv/buddy-service.html#'+nonce;frame.style.cssText='width:100%;height:100px;border:0';
  function finish(error,value){if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);signal.removeEventListener('abort',abort);frame.remove();error?reject(error):resolve(value);}
  const abort=()=>finish(Error('Request cancelled.')),timer=setTimeout(()=>finish(Error('Your buddy could not connect. Try again.')),115000);
  function receive(event){if(event.origin!=='https://doctorew.com'||event.source!==frame.contentWindow||event.data?.nonce!==nonce)return;const data=event.data;
   if(data.type==='ready'&&!sent){sent=true;frame.contentWindow.postMessage({type:'request',nonce,mode,request},'https://doctorew.com');}
   if(data.type==='phase'&&typeof data.text==='string')onPhase(data.text.slice(0,160));
   if(data.type==='result')finish(null,data.value);
   if(data.type==='error')finish(Error(data.code==='roster-refresh'?'That companion list changed. Reopen chat to refresh it.':'Your buddy could not finish. Please try again.'));
  }
  window.addEventListener('message',receive);signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}onPhase('Connecting securely to your buddy…');container.append(frame);
 });
}

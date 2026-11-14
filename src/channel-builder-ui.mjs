import {chooseHost,HOST_PORTRAITS,channelOffer,validateChannelPlan} from './channel-builder.mjs';
import {createChannelAi} from './channel-ai.mjs';
export function mountChannelBuilder({getCatalog,isReady,onTune,requestPlan}={}) {
  const $=id=>document.getElementById(id),dialog=$('channel-builder');
  const request=requestPlan||createChannelAi({sitekey:document.querySelector('meta[name="yata-turnstile-sitekey"]')?.content,container:'#channel-verification'});
  let host=chooseHost(),plan=null,controller=null;
  const status=message=>{$('channel-builder-status').textContent=message;};
  function hostLabel(){
    $('channel-host-name').textContent=`Your host: ${host.name}`;
    const portrait=HOST_PORTRAITS[host.id],image=$('channel-host-image'),credit=$('channel-host-credit');
    image.hidden=!portrait;credit.hidden=!portrait;
    if(portrait){image.src=portrait.src;image.alt=portrait.caption;credit.textContent=portrait.caption+' · image credit ↗';credit.href=host.id==='murdock'?'https://doctorew.com/':'https://doctorew.com/host-portraits/credits.html#'+host.id;}else image.removeAttribute('src');
  }
  $('channel-host-image').addEventListener('error',()=>{$('channel-host-image').hidden=true;});
  function reset(){plan=null;$('channel-plan').hidden=true;status('');}
  function busy(value){$('build-channel').disabled=value;$('change-channel-host').disabled=value;$('channel-request').disabled=value;}
  $('open-channel-builder').addEventListener('click',()=>{if(!isReady()){status('Wait for the checked catalog to finish loading.');}dialog.showModal();$('channel-request').focus();});
  $('close-channel-builder').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{controller?.abort();controller=null;busy(false);});
  $('change-channel-host').addEventListener('click',()=>{host=chooseHost(host.id);hostLabel();reset();});
  $('channel-request').addEventListener('input',reset);
  $('channel-builder-form').addEventListener('submit',async event=>{
    event.preventDefault();if(controller)return;reset();
    if(!isReady()){status('Wait for the checked catalog to finish loading.');return;}
    const question=$('channel-request').value.trim(),shows=channelOffer(getCatalog());
    if(!question||question.length>1000){status('Give the host a request of 1–1,000 characters.');return;}
    if(!shows.length){status('There are no checked TV shows to build from yet.');return;}
    controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),120000);busy(true);
    try{const result=await request({question,host:host.id,shows:JSON.stringify(shows)},current.signal,status);if(current.signal.aborted)return;plan=validateChannelPlan(result,getCatalog(),host.id);
      $('channel-plan-title').textContent=plan.title;$('channel-plan-intro').textContent=plan.intro;
      $('channel-plan-shows').replaceChildren(...plan.showIds.map(id=>{const node=document.createElement('li');node.textContent=getCatalog().shows.find(show=>show.id===id).title;return node;}));
      $('tune-custom-channel').hidden=!plan.showIds.length;$('channel-plan').hidden=false;status(plan.showIds.length?'Review the lineup, then tune in.':'No matching checked shows. Try a different request.');
    }catch(error){if(dialog.open)status(current.signal.aborted?'Request cancelled or timed out. Try again.':error.message);}
    finally{clearTimeout(timer);if(controller===current){controller=null;busy(false);}}
  });
  $('tune-custom-channel').addEventListener('click',async()=>{if(!plan)return;try{const checked=validateChannelPlan(plan,getCatalog(),host.id);if(!checked.showIds.length)return;if(await onTune(checked.showIds)){dialog.close();}}catch(error){reset();status(error.message);}});
  hostLabel();
}

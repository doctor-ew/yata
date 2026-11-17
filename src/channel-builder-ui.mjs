import{getBuddySession}from'./buddy-state.mjs';
import{createCustomChannel}from'./custom-channel.mjs';
import{createLineupLink}from'./lineup-share.mjs';
import {chooseHost,HOST_PORTRAITS,channelOffer,validateChannelPlan} from './channel-builder.mjs';
import {createChannelAi} from './channel-ai.mjs';
export function mountChannelBuilder({getCatalog,isReady,onTune,requestPlan}={}) {
  const $=id=>document.getElementById(id),dialog=$('channel-builder');
  const request=requestPlan||createChannelAi({sitekey:document.querySelector('meta[name="yata-turnstile-sitekey"]')?.content,container:'#channel-verification'});
  const buddy=getBuddySession();let host=buddy.persona,plan=null,controller=null,returnToApp=false,autoTune=false;
  const returnButton=document.createElement('a');returnButton.className='button primary';returnButton.id='return-channel-app';returnButton.hidden=true;returnButton.textContent='Use this channel in the YATA app';$('channel-plan').append(returnButton);
  const status=message=>{$('channel-builder-status').textContent=message;};
  function hostLabel(){
    $('channel-builder-form').dataset.host=host.id;
    $('channel-host-name').textContent=`Your host: ${host.name}`;
    const portrait=HOST_PORTRAITS[host.id],image=$('channel-host-image'),credit=$('channel-host-credit');
    image.hidden=!portrait;credit.hidden=!portrait;
    if(portrait){image.src=portrait.src;image.alt=portrait.caption;credit.textContent=portrait.caption+' · image credit ↗';credit.href=portrait.credit;}else image.removeAttribute('src');
  }
  $('channel-host-image').addEventListener('error',()=>{$('channel-host-image').hidden=true;});
  function reset(){plan=null;$('channel-plan').hidden=true;returnButton.hidden=true;status('');}
  function busy(value){$('build-channel').disabled=value;$('change-channel-host').disabled=value;$('channel-request').disabled=value;}
  function openBuilder(question='',returning=false,automatic=false,start=false){returnToApp=returning;autoTune=start&&!returning;document.getElementById('buddy-panel')?.close();if(question)$('channel-request').value=question;reset();if(!isReady())status('Wait for the checked catalog to finish loading.');if(!dialog.open)dialog.showModal();$('channel-request').focus();if(automatic&&isReady())$('channel-builder-form').requestSubmit();}
  $('open-channel-builder').addEventListener('click',()=>openBuilder());
  window.addEventListener('yata:open-builder',event=>openBuilder(event.detail?.question||'',event.detail?.returnToApp===true,event.detail?.autoBuild===true,event.detail?.autoTune===true));
  $('close-channel-builder').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{controller?.abort();controller=null;busy(false);});
  $('change-channel-host').addEventListener('click',()=>buddy.shuffle());
  buddy.subscribe(()=>{controller?.abort();host=buddy.persona;hostLabel();reset();});
  $('channel-request').addEventListener('input',reset);
  $('channel-builder-form').addEventListener('submit',async event=>{
    event.preventDefault();if(controller)return;reset();
    if(!isReady()){status('Wait for the checked catalog to finish loading.');return;}
    const question=$('channel-request').value.trim(),shows=channelOffer(getCatalog());
    if(!question||question.length>1000){status('Give the host a request of 1–1,000 characters.');return;}
    if(!shows.length){status('There are no checked TV shows to build from yet.');return;}
    controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),120000);busy(true);
    try{const result=await request({question,host:host.id,shows:JSON.stringify(shows)},current.signal,status);if(current.signal.aborted)return;plan=validateChannelPlan(result,getCatalog(),host.id);if(autoTune&&plan.showIds.length){if(await onTune(plan.showIds,plan.title)){dialog.close();return;}}
      $('channel-plan-title').textContent=plan.title;$('channel-plan-intro').textContent=plan.intro;
      $('channel-plan-shows').replaceChildren(...plan.showIds.map(id=>{const node=document.createElement('li');node.textContent=getCatalog().shows.find(show=>show.id===id).title;return node;}));
      if(returnToApp&&plan.showIds.length){const temporary=createCustomChannel(getCatalog(),plan.showIds,plan.title);returnButton.href='yata://tv/'+new URL(createLineupLink(temporary)).hash;returnButton.hidden=false;}
      $('tune-custom-channel').hidden=!plan.showIds.length;$('channel-plan').hidden=false;status(plan.showIds.length?'Review the lineup, then save it to channel 00.':'No matching checked shows. Try a different request.');
    }catch(error){if(dialog.open)status(current.signal.aborted?'Request cancelled or timed out. Try again.':error.message);}
    finally{clearTimeout(timer);if(controller===current){controller=null;busy(false);}}
  });
  $('tune-custom-channel').addEventListener('click',async()=>{if(!plan)return;try{const checked=validateChannelPlan(plan,getCatalog(),host.id);if(!checked.showIds.length)return;if(await onTune(checked.showIds,checked.title)){dialog.close();}}catch(error){reset();status(error.message);}});
  hostLabel();
}

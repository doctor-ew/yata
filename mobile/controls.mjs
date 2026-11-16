import{createEpisodeLink}from'../src/share.mjs';
export function backgroundEpisodeShare(options,item,seconds){return {...options,title:item.showTitle,url:createEpisodeLink({baseUrl:'https://doctorew.com/tv/',showId:item.showId,sourceUrl:item.url,seconds:options.includePosition?Math.floor(seconds):0})};}
export function mountMobileControls({Capacitor,App,Share,Catalog,Audio}){
 const android=Capacitor.getPlatform()==='android';
 const root=document.createElement('section');root.className='mobile-controls';root.setAttribute('aria-label','App controls');root.innerHTML='<h3>YATA on your phone</h3><div class="mobile-control-buttons"></div><p role="status" class="muted" data-mobile-status></p>';
 document.querySelector('.channel-builder-action').after(root);
 const buttons=root.querySelector('.mobile-control-buttons'),status=root.querySelector('[data-mobile-status]');
 const add=(label,action)=>{const button=document.createElement('button');button.type='button';button.className='button small';button.textContent=label;button.onclick=async()=>{try{await action();}catch(error){if(!/cancel/i.test(error.message||''))status.textContent=error.message||'This action could not finish.';}};buttons.append(button);return button;};
 const snapshot=()=>{let state;window.dispatchEvent(new CustomEvent('yata:request-playback',{detail:{respond:value=>state=value}}));if(!state)throw Error('The station is still loading.');return state;};
 let audioItems=null,busy=false;
 globalThis.yataNativeShare=async options=>{if(options.nowPlaying&&audioItems){const state=await Audio.status(),item=audioItems[state.index];if(state.active&&item)options=backgroundEpisodeShare(options,item,state.seconds);}const {nowPlaying,includePosition,...share}=options;return Share.share({...share,dialogTitle:'Share episode'});};
 const remember=value=>{try{value?localStorage.setItem('yata.background-audio.v1','1'):localStorage.removeItem('yata.background-audio.v1');}catch{}};
 const audioButton=android?add('Listen in background',async()=>{
  if(busy)return;busy=true;
  try{
   if(audioItems){const state=await Audio.stop(),item=audioItems[state.index]||audioItems[0];audioItems=null;remember(false);audioButton.textContent='Listen in background';window.dispatchEvent(new CustomEvent('yata:resume-video',{detail:{item,seconds:state.seconds}}));status.textContent='Back to video.';return;}
   const state=snapshot();if(!state.items.length)throw Error(state.provider==='youtube'?'YouTube stays in its visible player. Background audio is available for Archive sources.':'Start an Archive episode first.');
   window.dispatchEvent(new Event('yata:pause-video'));
   await Audio.play({items:state.items,seconds:state.seconds});audioItems=state.items;remember(true);audioButton.textContent='Return to video';status.textContent='Background audio is on. You can lock the screen. Use the notification or lock screen to pause, seek or skip.';
  }finally{busy=false;}
 }):null;
 window.addEventListener('yata:playback-changed',()=>{if(audioItems){audioItems=null;remember(false);audioButton.textContent='Listen in background';void Audio.stop();}});
 if(android){try{if(localStorage.getItem('yata.background-audio.v1'))void Audio.status().then(state=>{if(state.active&&state.items?.length){audioItems=state.items;audioButton.textContent='Return to video';status.textContent='Background audio is still running.';}else remember(false);}).catch(()=>remember(false));}catch{}}
 const refresh=async()=>{if(!audioItems||document.hidden)return;try{const state=await Audio.status();status.textContent=state.error||`${state.playing?'Listening':'Paused / loading'}: ${state.title}. Return to video when ready.`;}catch{}};
 setInterval(refresh,2000);
 add('Share lineup',()=>{const state=snapshot();return Share.share({title:state.share.title,text:'My YATA lineup',url:state.share.url,dialogTitle:'Share lineup'});});
 add('Share YATA',()=>Share.share({title:'YATA · It’s probably a rerun.',text:'Retro TV, personal channels and a vintage TV guide.',url:'https://doctorew.com/tv/',dialogTitle:'Share YATA'}));
 if(android)add('Send Android installer',async()=>{const file=await Catalog.packageFile();return Share.share({title:'YATA Android test app',text:'YATA test APK for Android. Install only if you trust the sender.',files:[file.url],dialogTitle:'Share Android installer'});});
 const controls=document.createElement('dialog');controls.id='touch-konami';controls.setAttribute('aria-label','Arcade unlock controls');
 const title=document.createElement('h2');title.textContent='Unlock the Arcade';const help=document.createElement('p');help.textContent='Enter ↑ ↑ ↓ ↓ ← → ← → B A, tap Done, then choose Channel 03 · Arcade. Games open in a browser tab in this build.';controls.append(title,help);
 const keys=document.createElement('div');keys.className='mobile-control-buttons';controls.append(keys);
 for(const[key,label]of[['ArrowUp','↑'],['ArrowDown','↓'],['ArrowLeft','←'],['ArrowRight','→'],['b','B'],['a','A']]){const button=document.createElement('button');button.textContent=label;button.className='button';button.type='button';button.onclick=()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));if(!document.querySelector('#arcade-channel').disabled)help.textContent='Arcade unlocked! Tap Done, then Channel 03 · Arcade.';};keys.append(button);}
 const close=document.createElement('button');close.textContent='Done';close.className='button primary';close.onclick=()=>controls.close();controls.append(close);document.body.append(controls);
 add('Arcade · how to unlock',()=>controls.showModal());
 const brand=document.querySelector('.brand');let timer;brand.addEventListener('pointerdown',()=>timer=setTimeout(()=>controls.showModal(),900));for(const event of['pointerup','pointercancel','pointerleave'])brand.addEventListener(event,()=>clearTimeout(timer));
 const incoming=url=>{try{const link=new URL(url);if(link.protocol==='yata:'&&link.hostname==='tv'&&link.hash.length<=6000)location.hash=link.hash;}catch{}};
 void App.addListener('appUrlOpen',event=>incoming(event.url));void App.getLaunchUrl().then(result=>{if(result?.url)incoming(result.url);});
}

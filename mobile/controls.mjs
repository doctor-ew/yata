import{createEpisodeLink}from'../src/share.mjs';
import{mountMobileNavigation}from'./navigation.mjs';
export function backgroundEpisodeShare(options,item,seconds){return {...options,title:item.showTitle,url:createEpisodeLink({baseUrl:'https://doctorew.com/tv/',showId:item.showId,sourceUrl:item.url,seconds:options.includePosition?Math.floor(seconds):0})};}
export function mountMobileControls({Capacitor,App,Share,Catalog,Audio}){
 const android=Capacitor.getPlatform()==='android';let audioItems=null,preparedItems=null,video=null,generation=0,restoring=false;
 const snapshot=()=>{let state;window.dispatchEvent(new CustomEvent('yata:request-playback',{detail:{respond:value=>state=value}}));if(!state)throw Error('The station is still loading.');return state;};
 const report=error=>{if(/cancel/i.test(error?.message||''))return;const note=document.querySelector('#notice');note.textContent=error?.message||'This action could not finish.';note.hidden=false;};
 globalThis.yataNativeShare=async options=>{if(options.nowPlaying&&audioItems){const state=await Audio.status(),item=audioItems[state.index];if(state.active&&item)options=backgroundEpisodeShare(options,item,state.seconds);}const {nowPlaying,includePosition,...share}=options;return Share.share({...share,dialogTitle:'Share episode'});};
 const updatePosition=()=>{if(!android||!video||audioItems||document.hidden)return;void Audio.position({seconds:video.currentTime||0,playing:!video.paused&&!video.ended}).catch(report);};
 const arm=async()=>{
  if(!android)return;const current=generation,state=snapshot();video=document.querySelector('#player-host video');
  if(!video||state.provider!=='archive'||!state.items.length)return;preparedItems=state.items;
  try{await Audio.arm({items:state.items,seconds:state.seconds,playing:!video.paused&&!video.ended});if(current!==generation)return;
   for(const event of['playing','pause','seeked','loadedmetadata'])video.addEventListener(event,updatePosition);
  }catch(error){report(error);}
 };
 const foreground=async()=>{
  if(!android||restoring)return;
  if(document.body.classList.contains('public-catalog-pending')){setTimeout(foreground,250);return;}
  restoring=true;const current=generation;
  try{const state=await Audio.status();if(!state.active||!state.items?.length){audioItems=null;return;}audioItems=state.items;
   const stopped=await Audio.stop();if(current!==generation)return;const item=audioItems[stopped.index]||audioItems[0];audioItems=null;video=null;
   window.dispatchEvent(new CustomEvent('yata:resume-video',{detail:{item,seconds:stopped.seconds,playWhenReady:stopped.playWhenReady&&!stopped.ended}}));
  }catch(error){report(error);}finally{restoring=false;}
 };
 window.addEventListener('yata:playback-changed',()=>{generation++;video=null;audioItems=null;preparedItems=null;if(android)void Audio.disarm().catch(report);});
 window.addEventListener('yata:playback-ready',()=>{void arm();});
 if(android)setInterval(updatePosition,750);
 void App.addListener('appStateChange',({isActive})=>{
  if(isActive){void foreground();return;}
  if(android&&video&&!video.paused)audioItems=preparedItems;
  window.dispatchEvent(new Event('yata:pause-video'));
 });
 if(android)void foreground();
 mountMobileNavigation({android,report,actions:{
  lineup:()=>{const state=snapshot();if(state.share.error)throw Error(state.share.error);return Share.share({title:state.share.title,text:'My YATA lineup',url:state.share.url,dialogTitle:'Share lineup'});},
  website:()=>Share.share({title:'YATA · It’s probably a rerun.',text:'Retro TV, personal channels and a vintage TV guide.',url:'https://doctorew.com/tv/',dialogTitle:'Share YATA'}),
  installer:async()=>{const file=await Catalog.packageFile();return Share.share({title:'YATA Android test app',text:'YATA test APK for Android. Install only if you trust the sender.',files:[file.url],dialogTitle:'Share Android installer'});}
 }});
 const incoming=url=>{try{const link=new URL(url);if(link.protocol==='yata:'&&link.hostname==='tv'&&link.hash.length<=6000)location.hash=link.hash;}catch{}};
 void App.addListener('appUrlOpen',event=>incoming(event.url));void App.getLaunchUrl().then(result=>{if(result?.url)incoming(result.url);});
}

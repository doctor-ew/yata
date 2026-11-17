import{getAnalytics}from'../src/analytics.mjs';
import{createBuddyHandoff}from'../src/buddy-bridge.mjs';
import{Capacitor,registerPlugin,SystemBars,SystemBarsStyle}from'@capacitor/core';
import{App}from'@capacitor/app';
import{Browser}from'@capacitor/browser';
import{Share}from'@capacitor/share';
import{mountMobileControls}from'./controls.mjs';
const Catalog=registerPlugin('YataCatalog');
const native=Capacitor.isNativePlatform(),originalFetch=window.fetch.bind(window);
globalThis.yataAnalyticsPlatform=native?Capacitor.getPlatform():'web';
if(native){
 document.documentElement.classList.add('native-app');
 globalThis.yataPublicAssetBase='https://doctorew.com/tv/';
 await SystemBars.setStyle({style:SystemBarsStyle.Dark});
 // Only public catalog JSON and Archive subtitle text cross this limited bridge.
 // Video remains in its original player.
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
  const catalog=url.origin===location.origin&&(/^\/tv\/data\/(?:published-catalog-manifest|library-art|arcade-games)\.json$/.test(url.pathname)||/^\/tv\/data\/catalogs\/[a-f0-9]{64}\.json$/.test(url.pathname));
  const caption=url.hostname==='archive.org'&&url.protocol==='https:'&&/^\/download\/[^/]+\/.+\.(vtt|srt)$/i.test(url.pathname);
  if(!catalog&&!caption)return originalFetch(input,options);
  try{
   const result=await Catalog.read(caption?{captionUrl:url.href}:{path:url.pathname});
   return new Response(result.text,{status:200,headers:{'Content-Type':caption?'text/plain':'application/json'}});
  }catch{return originalFetch(input,options);}
 };
 const open=url=>Browser.open({url,toolbarColor:'#211b14'});
 globalThis.yataOpenArcadeGame=async id=>{const {ARCADE_GAMES}=await import('./src/arcade-games.mjs');if(!ARCADE_GAMES.some(g=>g.id===id&&g.status==='installed'))throw Error('Unknown Arcade game.');return open('https://doctorew.com/arcade/?game='+encodeURIComponent(id));};
 globalThis.yataBuddyBridge=request=>{getAnalytics().record('ai_handoff',{host:request.host});return open(createBuddyHandoff(request));};
 globalThis.yataOpenFeedback=url=>{const parsed=new URL(url);if(parsed.origin!=='https://github.com'||parsed.pathname!=='/doctor-ew/yata/issues/new')throw Error('Invalid feedback destination.');return open(parsed.href);};
 document.addEventListener('submit',e=>{if(e.target.id==='channel-builder-form'){e.preventDefault();e.stopImmediatePropagation();const request={host:e.target.dataset.host,question:document.querySelector('#channel-request').value.trim(),action:'channel',nonce:crypto.randomUUID().replaceAll('-','')};document.querySelector('#channel-builder-status').textContent='Continue with your host in the verified web window, then choose Use this channel in the YATA app.';void globalThis.yataBuddyBridge(request).catch(error=>document.querySelector('#channel-builder-status').textContent=error.message);}},true);
 document.addEventListener('click',e=>{
  const arcade=e.target.closest('#arcade-channel');
  if(arcade&&!arcade.disabled){e.preventDefault();e.stopImmediatePropagation();open('https://doctorew.com/arcade/');return;}
  const anchor=e.target.closest('a[href]');if(anchor){const raw=anchor.getAttribute('href');if(raw.startsWith('#')){e.preventDefault();location.hash=raw;return;}const url=new URL(anchor.href,location.href);if(url.origin===location.origin&&url.pathname.endsWith('.md')){e.preventDefault();open('https://doctorew.com'+url.pathname);return;}if(['http:','https:'].includes(url.protocol)&&url.origin!==location.origin){e.preventDefault();e.stopImmediatePropagation();open(url.href);}}
 },true);
 document.addEventListener('yata:window-mode', event => { void (event.detail.open ? SystemBars.hide() : SystemBars.show()).catch(() => {}); });
 await App.addListener('backButton',({canGoBack})=>{
  if(document.body.classList.contains('window-mode')){document.dispatchEvent(new Event('yata:exit-fullscreen'));return;}
  const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return;}
  const expanded=document.querySelector('#episode-information[open]');if(expanded){expanded.open=false;return;}
  if(canGoBack)history.back();else if(location.hash!=='#watch')location.hash='watch';else App.minimizeApp();
 });
 globalThis.yataNativeShare=options=>Share.share({...options,dialogTitle:'Share YATA'});

}
await import('./src/app.mjs');

if(native)mountMobileControls({Capacitor,App,Share,Catalog,Audio:registerPlugin('YataAudio')});

import{Capacitor,registerPlugin,SystemBars,SystemBarsStyle}from'@capacitor/core';
import{App}from'@capacitor/app';
import{Browser}from'@capacitor/browser';
import{Share}from'@capacitor/share';
import{mountMobileControls}from'./controls.mjs';
const Catalog=registerPlugin('YataCatalog');
const native=Capacitor.isNativePlatform(),originalFetch=window.fetch.bind(window);
if(native){
 document.documentElement.classList.add('native-app');
 await SystemBars.setStyle({style:SystemBarsStyle.Dark});
 // Only public catalog JSON and Archive subtitle text cross this limited bridge.
 // Video remains in its original player.
 window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
  const catalog=url.origin===location.origin&&(/^\/tv\/data\/published-catalog-manifest\.json$/.test(url.pathname)||/^\/tv\/data\/catalogs\/[a-f0-9]{64}\.json$/.test(url.pathname));
  const caption=url.hostname==='archive.org'&&url.protocol==='https:'&&/^\/download\/[^/]+\/.+\.(vtt|srt)$/i.test(url.pathname);
  if(!catalog&&!caption)return originalFetch(input,options);
  try{
   const result=await Catalog.read(caption?{captionUrl:url.href}:{path:url.pathname});
   return new Response(result.text,{status:200,headers:{'Content-Type':caption?'text/plain':'application/json'}});
  }catch{return originalFetch(input,options);}
 };
 const open=url=>Browser.open({url,toolbarColor:'#211b14'});
 document.addEventListener('submit',e=>{if(e.target.id==='channel-builder-form'){e.preventDefault();e.stopImmediatePropagation();document.querySelector('#channel-builder-status').textContent='AI channel creation opens the website in this test build. Website lineups and app lineups are stored separately.';open('https://doctorew.com/tv/#watch');}},true);
 document.addEventListener('click',e=>{
  const arcade=e.target.closest('#arcade-channel');
  if(arcade&&!arcade.disabled){e.preventDefault();e.stopImmediatePropagation();open('https://doctorew.com/arcade/');return;}
  const anchor=e.target.closest('a[href]');if(anchor){const url=new URL(anchor.href,location.href);if(['http:','https:'].includes(url.protocol)&&url.origin!==location.origin){e.preventDefault();e.stopImmediatePropagation();open(url.href);}}
 },true);
 await App.addListener('backButton',({canGoBack})=>{
  const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();return;}
  const expanded=document.querySelector('#episode-information[open]');if(expanded){expanded.open=false;return;}
  if(canGoBack)history.back();else if(location.hash!=='#watch')location.hash='watch';else App.minimizeApp();
 });
 globalThis.yataNativeShare=options=>Share.share({...options,dialogTitle:'Share YATA'});
 await App.addListener('appStateChange',({isActive})=>{if(!isActive)window.dispatchEvent(new Event('yata:pause-video'));});
}
await import('./src/app.mjs');

if(native)mountMobileControls({Capacitor,App,Share,Catalog,Audio:registerPlugin('YataAudio')});

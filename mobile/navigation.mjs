import{mountFullscreenNavigation}from'./fullscreen-navigation.mjs';
import{mountAnalyticsSettings}from'../src/analytics.mjs';
import{mountAppearance}from'./appearance.mjs';
export function mountMobileNavigation({android,report,actions}){
 const doc=document,html=doc.documentElement;
 const button=(text,action)=>{const b=doc.createElement('button');b.type='button';b.textContent=text;b.className='native-menu-item';b.onclick=async()=>{try{await action();}catch(error){report(error);}};return b;};
 const menu=doc.createElement('dialog');menu.id='native-more';menu.setAttribute('aria-label','More options');
 const heading=doc.createElement('h2');heading.textContent='More';menu.append(heading);
 const group=name=>{const section=doc.createElement('section'),title=doc.createElement('h3');title.textContent=name;section.append(title);menu.append(section);return section;};
 const invoke=id=>{menu.close();doc.getElementById(id)?.click();};
 const sharing=group('Share');sharing.append(button('Episode',()=>invoke('share-episode')),button('Channel / playlist',()=>{menu.close();return actions.lineup();}),button('YATA website',()=>{menu.close();return actions.website();}));
 if(android)sharing.append(button('Android installer',()=>{menu.close();return actions.installer();}));
 const time=doc.createElement('label'),check=doc.createElement('input');check.type='checkbox';check.onchange=()=>doc.querySelector('#share-time').checked=check.checked;time.append(check,' Include episode position');sharing.append(time);
 const privacy=group('Privacy');mountAnalyticsSettings(privacy);
 const playback=group('Playback');playback.append(button('Your Channel 00 queue',()=>{menu.close();location.hash='watch';const queue=doc.getElementById('episode-queue');if(queue){queue.open=true;queue.scrollIntoView({block:'start',behavior:'smooth'});}}));for(const[label,id]of[['Previous episode','previous-episode'],['Restart episode','start-over'],['Show position','toggle-seek-panel'],['Fill screen','fill-window'],['Mute / unmute','video-mute']])playback.append(button(label,()=>invoke(id)));
 const channels=group('Channels');for(const[label,id]of[['Make a channel','open-channel-builder'],['Playback settings','open-stream-settings']])channels.append(button(label,()=>invoke(id)));
 for(const id of['remix-panel','mix-panel'])channels.append(doc.getElementById(id));
 mountAppearance(group('Appearance'));
 const companion=group('Company');companion.append(button('Your TV buddy',()=>{menu.close();window.dispatchEvent(new Event('yata:open-buddy'));}));
 const about=group('About');const credits=doc.querySelector('.creator-byline');if(credits)about.append(credits);const footer=doc.querySelector('footer');if(footer)about.append(footer);
 const close=button('Done',()=>menu.close());close.classList.add('native-menu-close');menu.append(close);doc.body.append(menu);
 const more=button('⋯',()=>{check.checked=doc.querySelector('#share-time').checked;check.disabled=doc.querySelector('#share-time').disabled;menu.showModal();});more.id='native-more-button';more.setAttribute('aria-label','More options');more.setAttribute('aria-haspopup','dialog');doc.querySelector('.masthead').append(more);
 const picker=doc.createElement('select');picker.id='native-channel';picker.setAttribute('aria-label','Channel');const pickerWrap=doc.createElement('label');pickerWrap.className='native-channel-switch';const pickerText=doc.createElement('span');pickerText.textContent='Channel';pickerWrap.append(pickerText,picker);doc.querySelector('.transport[aria-label="Video playback controls"]').before(pickerWrap);
 const originalChannels=doc.getElementById('channels');
 const sync=()=>{const nodes=[...originalChannels.children];picker.replaceChildren(...nodes.flatMap((node,index)=>{if(node.disabled)return [];const option=doc.createElement('option');option.value=String(index);option.textContent=node.getAttribute('aria-label');option.selected=node.getAttribute('aria-pressed')==='true';return [option];}));picker.disabled=doc.body.classList.contains('public-catalog-pending');};
 picker.onchange=()=>originalChannels.children[Number(picker.value)]?.click();new MutationObserver(sync).observe(originalChannels,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-pressed']});sync();
 const nav=doc.createElement('nav');nav.id='native-navigation';nav.setAttribute('aria-label','Main navigation');
 const navLinks=doc.createElement('div');navLinks.id='native-navigation-links';nav.append(navLinks);
 for(const[id,label]of[['watch','Watch'],['guide','Guide'],['library','Library']]){const a=doc.createElement('a');a.href='#'+id;a.textContent=label;a.dataset.view=id;navLinks.append(a);}doc.body.append(nav);
 mountFullscreenNavigation({doc,nav,links:navLinks,screen:doc.getElementById('screen-column')});
 const view=()=>{const selected=['guide','library'].includes(location.hash.slice(1))?location.hash.slice(1):'watch';html.dataset.nativeView=selected;for(const a of navLinks.children){if(a.dataset.view===selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}};
 window.addEventListener('hashchange',view);view();window.addEventListener('yata:playback-ready',()=>{history.replaceState(null,'','#watch');view();});
 const info=doc.querySelector('.watch-info'),description=doc.querySelector('#episode-information');doc.querySelector('.transport[aria-label="Video playback controls"]').after(info);info.after(description);
 const controls=doc.createElement('dialog');controls.id='touch-konami';controls.setAttribute('aria-label','Arcade unlock controls');const title=doc.createElement('h2');title.textContent='A familiar sequence…';const help=doc.createElement('p');help.textContent='↑ ↑ ↓ ↓ ← → ← → B A';controls.append(title,help);const keys=doc.createElement('div');keys.className='native-secret-keys';controls.append(keys);
 for(const[key,label]of[['ArrowUp','↑'],['ArrowDown','↓'],['ArrowLeft','←'],['ArrowRight','→'],['b','B'],['a','A']]){const b=button(label,()=>{doc.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));if(!doc.querySelector('#arcade-channel').disabled)help.textContent='Channel 03 unlocked.';});keys.append(b);}controls.append(button('Done',()=>controls.close()));doc.body.append(controls);
 const brand=doc.querySelector('.brand');let timer,held=false,startX=0,startY=0;
 const cancel=()=>{clearTimeout(timer);timer=null;};
 brand.addEventListener('contextmenu',event=>{event.preventDefault();cancel();held=true;doc.getSelection()?.removeAllRanges();if(!controls.open)controls.showModal();});
 brand.addEventListener('selectstart',event=>event.preventDefault());
 brand.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  cancel();held=false;startX=event.clientX;startY=event.clientY;
  // Android WebView otherwise begins text selection before the hold completes.
  event.preventDefault();brand.setPointerCapture?.(event.pointerId);
  timer=setTimeout(()=>{held=true;doc.getSelection()?.removeAllRanges();controls.showModal();},600);
 });
 brand.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-startX,event.clientY-startY)>16)cancel();});
 for(const event of['pointerup','pointercancel','lostpointercapture'])brand.addEventListener(event,cancel);
 brand.addEventListener('click',event=>{if(held){event.preventDefault();event.stopPropagation();held=false;}},true);

}

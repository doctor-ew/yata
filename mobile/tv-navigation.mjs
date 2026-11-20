// Loaded only by the separate TV package, never by the phone entry point.
export function directionalTarget(current, candidates, key) {
 const horizontal=key==='ArrowLeft'||key==='ArrowRight', sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1;
 const cx=current.x+current.width/2, cy=current.y+current.height/2;
 return candidates.map(item=>{const r=item.rect,dx=r.x+r.width/2-cx,dy=r.y+r.height/2-cy;
  const forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);
  return {...item,score:forward>1?forward+cross*3:Infinity};
 }).filter(item=>Number.isFinite(item.score)).sort((a,b)=>a.score-b.score)[0]?.element;
}
export function mountTvNavigation(doc=document) {
 const win=doc.defaultView, selector='button,a[href],input,select,textarea,summary,[tabindex]';
 doc.documentElement.classList.add('yata-tv');
 let lastFocus=null,editing=null,scheduled=false;
 const origins=new WeakMap();
 const visible=el=>!el.disabled&&!el.closest('[hidden],[inert],[aria-disabled="true"]')&&el.getClientRects().length>0&&win.getComputedStyle(el).visibility!=='hidden';
 const scope=()=>[...doc.querySelectorAll('dialog[open]')].at(-1)||doc.body;
 const candidates=()=>[...scope().querySelectorAll(selector)].filter(el=>el.tabIndex>=0&&visible(el));
 const focus=el=>{if(el){el.focus({preventScroll:true});el.scrollIntoView({block:'nearest',inline:'nearest'});}};
 const recover=()=>{scheduled=false;const active=doc.activeElement;if(active!==doc.body&&visible(active)&&scope().contains(active))return;
  focus(lastFocus&&visible(lastFocus)&&scope().contains(lastFocus)?lastFocus:candidates()[0]);};
 const schedule=()=>{if(!scheduled){scheduled=true;win.requestAnimationFrame(recover);}};
 const focusin=e=>{lastFocus=e.target;};
 const click=e=>{const trigger=e.target.closest(selector);if(trigger)lastFocus=trigger;};
 const close=e=>{if(e.target.tagName==='DIALOG'){const origin=origins.get(e.target);if(origin&&visible(origin))focus(origin);else schedule();}};
 const observer=new win.MutationObserver(records=>{for(const r of records){if(r.type==='attributes'&&r.attributeName==='open'&&r.target.tagName==='DIALOG'&&r.target.open&&!origins.has(r.target))origins.set(r.target,lastFocus);}schedule();});
 // Record the invoking element before showModal moves focus into the dialog.
 const remember=e=>{if(['Enter',' '].includes(e.key)||e.type==='pointerdown')for(const d of doc.querySelectorAll('dialog:not([open])'))origins.set(d,doc.activeElement);};
 const keydown=e=>{
  if(e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
  const active=doc.activeElement;
  if(e.key==='Escape'){
   if(editing){editing=null;active.blur();focus(active);e.preventDefault();e.stopImmediatePropagation();return;}
   const dialog=doc.querySelector('dialog[open]');if(dialog){dialog.close();e.preventDefault();e.stopImmediatePropagation();return;}
   if(doc.body.classList.contains('window-mode')){doc.dispatchEvent(new win.Event('yata:exit-fullscreen'));e.preventDefault();return;}
   if(win.location.hash!=='#watch'){win.location.hash='watch';e.preventDefault();return;}
   return;
  }
  const editable=active?.matches('textarea,input:not([type=range]):not([type=checkbox]):not([type=radio]),select');
  if(e.key==='Enter'&&editable){editing=active;return;}
  if(editing===active)return;
  if(!e.key.startsWith('Arrow'))return;
  // Horizontal input belongs to native sliders; up/down leaves the slider.
  if(active?.matches('input[type=range]')&&['ArrowLeft','ArrowRight'].includes(e.key))return;
  const nodes=candidates();if(!nodes.length)return;
  if(active?.closest('#native-navigation')&&['ArrowLeft','ArrowRight'].includes(e.key)){
   const tabs=nodes.filter(el=>el.closest('#native-navigation')),index=tabs.indexOf(active);
   focus(tabs[index+(e.key==='ArrowLeft'?-1:1)]);e.preventDefault();e.stopImmediatePropagation();return;
  }
  const target=nodes.includes(active)?directionalTarget(active.getBoundingClientRect(),nodes.filter(el=>el!==active).map(element=>({element,rect:element.getBoundingClientRect()})),e.key):nodes[0];
  e.preventDefault();e.stopImmediatePropagation();editing=null;focus(target);
 };
 doc.addEventListener('keydown',remember,true);doc.addEventListener('pointerdown',remember,true);
 doc.addEventListener('keydown',keydown,true);doc.addEventListener('focusin',focusin);doc.addEventListener('click',click,true);doc.addEventListener('close',close,true);
 observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','open','class']});
 win.addEventListener('hashchange',schedule);schedule();
 return ()=>{observer.disconnect();doc.removeEventListener('keydown',remember,true);doc.removeEventListener('pointerdown',remember,true);doc.removeEventListener('keydown',keydown,true);doc.removeEventListener('focusin',focusin);doc.removeEventListener('click',click,true);doc.removeEventListener('close',close,true);win.removeEventListener('hashchange',schedule);doc.documentElement.classList.remove('yata-tv');};
}

export const SEEK_VISIBILITY_KEY='yata.seek-visibility.v1';
export function mountSeekVisibility({transport,panel,toggle,select,storage}){
 const modes=['auto','always','off'];let mode='auto',hover=false,pinned=false;
 try{const saved=storage.getItem(SEEK_VISIBILITY_KEY);if(modes.includes(saved))mode=saved;}catch{}
 function sync(){const focus=transport.contains(transport.ownerDocument.activeElement)&&transport.ownerDocument.activeElement?.matches(':focus-visible');const visible=mode==='always'||mode==='auto'&&(hover||pinned||focus);panel.hidden=!visible;transport.dataset.seekVisibility=mode;toggle.hidden=mode!=='auto';toggle.setAttribute('aria-expanded',String(visible));toggle.setAttribute('aria-pressed',String(pinned));select.value=mode;}
 select.addEventListener('change',()=>{if(!modes.includes(select.value))return;mode=select.value;pinned=false;try{storage.setItem(SEEK_VISIBILITY_KEY,mode);}catch{}sync();});
 toggle.addEventListener('click',()=>{pinned=!pinned;sync();});transport.addEventListener('pointerenter',event=>{if(event.pointerType==='touch')return;hover=true;sync();});transport.addEventListener('pointerleave',()=>{hover=false;sync();});transport.addEventListener('focusin',sync);transport.addEventListener('focusout',()=>queueMicrotask(sync));
 sync();return{sync};
}

// Only navigation moves; provider iframes and video elements stay in place.
export function mountFullscreenNavigation({doc, nav, links, screen}) {
 const toggle=doc.createElement('button');toggle.type='button';toggle.id='native-navigation-toggle';
 toggle.setAttribute('aria-controls',links.id);toggle.hidden=true;nav.prepend(toggle);
 const parent=nav.parentElement,next=nav.nextSibling;let fullscreen=false;
 function expand(value){
  links.hidden=fullscreen&&!value;
  nav.dataset.collapsed=String(fullscreen&&!value);
  toggle.textContent=value?'⌄':'⌃';
  toggle.setAttribute('aria-expanded',String(value));
  toggle.setAttribute('aria-label',value?'Hide navigation':'Show navigation');
 }
 const click=()=>expand(links.hidden);
 const change=event=>{
  fullscreen=event.detail.open;toggle.hidden=!fullscreen;
  if(fullscreen){screen.append(nav);nav.inert=false;}
  else if(next?.parentElement===parent)parent.insertBefore(nav,next);
  else parent.append(nav);
  expand(false);
 };
 toggle.addEventListener('click',click);doc.addEventListener('yata:window-mode',change);
 return {dispose(){change({detail:{open:false}});toggle.removeEventListener('click',click);doc.removeEventListener('yata:window-mode',change);toggle.remove();}};
}

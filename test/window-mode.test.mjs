import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWindowMode } from '../src/window-mode.mjs';

test('window mode preserves player placement, restores inert/focus/scroll state and exits on Escape', () => {
 const documentRef = new EventTarget(); let restoredScroll; documentRef.defaultView = { scrollX: 0, scrollY: 480, scrollTo: (x, y) => { restoredScroll = [x, y]; } }; documentRef.documentElement = { style: { overflow: 'auto' } };
 class Element extends EventTarget {
  children = []; parentElement = null; inert = false; hidden = false; isConnected = true; attributes = new Map();
  append(child) { this.children.push(child); child.parentElement = this; }
  getAttribute(name) { return this.attributes.get(name) ?? null; } setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); }
  focus() { documentRef.activeElement = this; } getClientRects() { return this.hidden ? [] : [{}]; }
 }
 const body = new Element(), header = new Element(), main = new Element(), footer = new Element(), screen = new Element(), guide = new Element(), player = new Element(), toggle = new Element(), closeButton = new Element();
 documentRef.body = body; const classes = new Set(); body.classList = { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) };
 body.append(header); body.append(main); body.append(footer); main.append(screen); main.append(guide); screen.append(closeButton); screen.append(player); screen.append(toggle);
 screen.querySelectorAll = () => [closeButton, toggle]; footer.inert = true; closeButton.hidden = true; documentRef.activeElement = toggle;
 const controls = mountWindowMode({ documentRef, screen, toggle, closeButton });
 controls.enter();
 assert.equal(controls.isOpen(), true); assert(classes.has('window-mode')); assert.equal(header.inert, true); assert.equal(guide.inert, true);
 assert.equal(screen.inert, false); assert.equal(player.parentElement, screen); assert.equal(screen.parentElement, main);
 assert.equal(screen.getAttribute('aria-modal'), 'true'); assert.equal(documentRef.activeElement, closeButton); assert.equal(documentRef.documentElement.style.overflow, 'hidden');
 const escape = new Event('keydown', { cancelable: true }); Object.defineProperty(escape, 'key', { value: 'Escape' }); documentRef.dispatchEvent(escape);
 assert.equal(controls.isOpen(), false); assert.equal(header.inert, false); assert.equal(guide.inert, false); assert.equal(footer.inert, true);
 assert.equal(screen.getAttribute('role'), null); assert.equal(documentRef.activeElement, toggle); assert.equal(documentRef.documentElement.style.overflow, 'auto');
 assert.equal(player.parentElement, screen); assert.equal(closeButton.hidden, true); assert.deepEqual(restoredScroll, [0, 480]);
 controls.enter(); controls.dispose(); assert.equal(controls.isOpen(), false); toggle.dispatchEvent(new Event('click')); assert.equal(controls.isOpen(), false);
});

function fullscreenFixture({nativeVideo=null,fullscreen=true,drawer=false}={}){
 const doc=new EventTarget(),view=new EventTarget();view.scrollTo=()=>{};view.innerWidth=390;view.innerHeight=844;let landscape=false;
 view.matchMedia=q=>({matches:q.includes('orientation')?landscape:q.includes('coarse')});doc.defaultView=view;doc.documentElement={style:{overflow:''}};doc.hidden=false;
 class Node extends EventTarget{children=[];parentElement=null;inert=false;hidden=false;isConnected=true;attributes=new Map();append(x){this.children.push(x);x.parentElement=this;}getAttribute(n){return this.attributes.get(n)??null;}setAttribute(n,v){this.attributes.set(n,v);}removeAttribute(n){this.attributes.delete(n);}focus(){doc.activeElement=this;}getClientRects(){return [{}];}}
 doc.body=new Node();doc.body.classList={toggle(){}};const screen=new Node(),toggle=new Node(),closeButton=new Node(),fullScreenButton=new Node();doc.body.append(screen);screen.append(toggle);screen.append(closeButton);screen.append(fullScreenButton);screen.querySelectorAll=()=>[toggle,closeButton,fullScreenButton];screen.querySelector=()=>nativeVideo;doc.activeElement=toggle;
 const controlsToggle=drawer?new Node():undefined,transport=drawer?new Node():undefined;if(drawer){screen.append(controlsToggle);screen.append(transport);}
 let requests=0;screen.requestFullscreen=fullscreen?async()=>{requests++;doc.fullscreenElement=screen;doc.dispatchEvent(new Event('fullscreenchange'));}:undefined;doc.exitFullscreen=async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));};
 let playing=true,watching=true;const controls=mountWindowMode({documentRef:doc,screen,toggle,closeButton,fullScreenButton,controlsToggle,transport,getPlaybackState:()=>({ready:true,paused:!playing}),isWatching:()=>watching});
 return{doc,view,screen,toggle,fullScreenButton,controlsToggle,transport,controls,requests:()=>requests,setPlaying:x=>playing=x,setWatching:x=>watching=x,rotate:value=>{landscape=value;view.innerWidth=value?844:390;view.innerHeight=value?390:844;view.dispatchEvent(new Event('resize'));}};
}
test('fullscreen button requests real fullscreen and browser exit restores the in-place layout',async()=>{
 const f=fullscreenFixture();f.fullScreenButton.click?.();f.fullScreenButton.dispatchEvent(new Event('click'));await Promise.resolve();assert.equal(f.requests(),1);assert.equal(f.controls.isOpen(),true);await f.doc.exitFullscreen();assert.equal(f.controls.isOpen(),false);assert.equal(f.screen.parentElement,f.doc.body);f.controls.dispose();
});
test('landscape expands only playing touch-phone playback and manual exit prevents immediate reopening',()=>{
 const f=fullscreenFixture();f.setPlaying(false);f.rotate(true);assert.equal(f.controls.isOpen(),false);f.setPlaying(true);f.rotate(true);assert.equal(f.controls.isOpen(),true);assert.equal(f.requests(),0);f.controls.exit();f.rotate(true);assert.equal(f.controls.isOpen(),false);f.rotate(false);f.rotate(true);assert.equal(f.controls.isOpen(),true);f.rotate(false);assert.equal(f.controls.isOpen(),false);f.setWatching(false);f.rotate(true);assert.equal(f.controls.isOpen(),false);f.controls.dispose();
});
test('unsupported fullscreen keeps a usable viewport fallback; iOS video uses its native media API',()=>{
 const video=new EventTarget();let entered=0;video.webkitEnterFullscreen=()=>entered++;
 const f=fullscreenFixture({fullscreen:false,nativeVideo:video});f.fullScreenButton.dispatchEvent(new Event('click'));assert.equal(entered,1);assert.equal(f.controls.isOpen(),true);video.dispatchEvent(new Event('webkitendfullscreen'));assert.equal(f.controls.isOpen(),false);f.controls.dispose();
});

test('a delayed browser fullscreen-exit event cannot close a newly rotated automatic view',async()=>{
 const f=fullscreenFixture();f.controls.enter();await Promise.resolve();
 f.doc.exitFullscreen=async()=>{};f.controls.exit();f.rotate(true);assert.equal(f.controls.isOpen(),true);
 f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));
 assert.equal(f.controls.isOpen(),true);f.rotate(false);assert.equal(f.controls.isOpen(),false);f.controls.dispose();
});

test('fullscreen playback drawer collapses on entry and restores normal controls on exit',()=>{
 const f=fullscreenFixture({fullscreen:false,drawer:true});
 f.controls.enter();assert.equal(f.transport.hidden,true);assert.equal(f.controlsToggle.hidden,false);assert.equal(f.controlsToggle.getAttribute('aria-expanded'),'false');
 f.controlsToggle.dispatchEvent(new Event('click'));assert.equal(f.transport.hidden,false);assert.equal(f.controlsToggle.getAttribute('aria-expanded'),'true');
 f.controlsToggle.dispatchEvent(new Event('click'));assert.equal(f.transport.hidden,true);
 f.controls.exit();assert.equal(f.transport.hidden,false);assert.equal(f.controlsToggle.hidden,true);assert.equal(f.screen.parentElement,f.doc.body);
 f.rotate(true);assert.equal(f.transport.hidden,true);f.rotate(false);assert.equal(f.transport.hidden,false);
 f.controls.dispose();f.controlsToggle.dispatchEvent(new Event('click'));assert.equal(f.transport.hidden,false);
});

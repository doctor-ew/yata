export const ARCADE_CHANNEL={id:'arcade',number:'03',name:'Arcade',games:['Star Wars','Spy Hunter','Q*bert','Donkey Kong','Star Raiders']};
const ARCADE_UNLOCK_KEY='yata.arcade-unlocked.v1';
export function readArcadeUnlock(storage){try{return (storage??globalThis.sessionStorage)?.getItem(ARCADE_UNLOCK_KEY)==='1';}catch{return false;}}
export function saveArcadeUnlock(storage){try{(storage??globalThis.sessionStorage)?.setItem(ARCADE_UNLOCK_KEY,'1');}catch{/* The current tab still unlocks when storage is unavailable. */}}
// The secret entrance is navigation, not an access-control boundary.
export function installArcadeEntry({target=globalThis.document,enabled=['127.0.0.1','localhost','doctorew.com','www.doctorew.com'].includes(globalThis.location?.hostname),open=()=>globalThis.location.assign('/arcade/')}={}){
 const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let pressed=[];
 const handler=event=>{if(!enabled||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;const element=event.target;if(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')){pressed=[];return;}const key=event.key.length===1?event.key.toLowerCase():event.key;pressed.push(key);while(pressed.length&&!pressed.every((value,i)=>value===code[i]))pressed.shift();// Cancel letter defaults only after the arrow sequence, so Firefox quick-find cannot steal B/A.
 if(pressed.length>=9)event.preventDefault();if(pressed.length===code.length){pressed=[];open();}};
 target?.addEventListener('keydown',handler);return()=>target?.removeEventListener('keydown',handler);
}

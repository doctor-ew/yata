// The secret entrance is navigation, not an access-control boundary.
export function installArcadeEntry({target=globalThis.document,enabled=['127.0.0.1','localhost','doctorew.com','www.doctorew.com'].includes(globalThis.location?.hostname),open=()=>globalThis.location.assign('/arcade/')}={}){
 const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];let pressed=[];
 const handler=event=>{if(!enabled||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;const element=event.target;if(element?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')){pressed=[];return;}const key=event.key.length===1?event.key.toLowerCase():event.key;pressed.push(key);while(pressed.length&&!pressed.every((value,i)=>value===code[i]))pressed.shift();if(pressed.length===code.length){pressed=[];event.preventDefault();open();}};
 target?.addEventListener('keydown',handler);return()=>target?.removeEventListener('keydown',handler);
}

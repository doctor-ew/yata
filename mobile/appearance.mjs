// New local-only preferences; launch selection runs once, never on app resume.
export const ROOM_FINISHES=[['walnut','Walnut paneling'],['denim','Faded denim'],['sunflower','Harvest wallpaper'],['memphis','Memphis after school'],['cork','Cork & avocado']];
export const ROOM_EMBLEMS=[['autobot','Autobots'],['decepticon','Decepticons'],['cobra','Cobra']];
export function pickFinish(previous,random=Math.random){const choices=ROOM_FINISHES.map(([id])=>id).filter(id=>id!==previous);return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];}
export function mountAppearance(section){
 const html=document.documentElement;const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 const pinned=read('yata-room-pinned');let finish=ROOM_FINISHES.some(([id])=>id===pinned)?pinned:pickFinish(read('yata-room-last'));
 const apply=()=>{html.dataset.room=finish;save('yata-room-last',finish);};apply();
 const label=document.createElement('label');label.textContent='Room finish';const select=document.createElement('select');select.id='native-room-finish';for(const[id,name]of ROOM_FINISHES){const o=new Option(name,id);select.add(o);}select.value=finish;label.append(select);section.append(label);
 const pinLabel=document.createElement('label'),pin=document.createElement('input');pin.type='checkbox';pin.checked=pinned===finish;pinLabel.append(pin,' Pin this finish (otherwise rotate each launch)');section.append(pinLabel);
 select.onchange=()=>{finish=select.value;apply();if(pin.checked)save('yata-room-pinned',finish);};pin.onchange=()=>save('yata-room-pinned',pin.checked?finish:'');
 const emblemLabel=document.createElement('label');emblemLabel.textContent='Vintage decal';const emblem=document.createElement('select');emblem.id='native-room-emblem';for(const[id,name]of [['rotate','Surprise me'],['none','No decal'],...ROOM_EMBLEMS])emblem.add(new Option(name,id));const preference=read('yata-room-emblem')||'rotate';emblem.value=[...emblem.options].some(o=>o.value===preference)?preference:'rotate';
 const decal=document.createElement('div');decal.id='native-room-decal';decal.setAttribute('aria-hidden','true');document.body.prepend(decal);
 const applyEmblem=()=>{const choice=emblem.value==='rotate'?ROOM_EMBLEMS[Math.floor(Math.random()*ROOM_EMBLEMS.length)][0]:emblem.value;decal.hidden=choice==='none';if(choice!=='none')decal.style.backgroundImage=`url("decor/${choice}.svg")`;};applyEmblem();emblem.onchange=()=>{save('yata-room-emblem',emblem.value);applyEmblem();};emblemLabel.append(emblem);section.append(emblemLabel);
 const note=document.createElement('p');note.className='native-room-note';note.textContent='A different room on each fresh launch. Your finish stays put while you watch.';section.append(note);
 const credits=document.createElement('p');credits.className='native-room-note';credits.append('Vintage insignia: Transformers / G.I. Joe, Hasbro. ');const link=document.createElement('a');link.href='decor/credits.html';link.textContent='Image sources';credits.append(link);section.append(credits);
}

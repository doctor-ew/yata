// Shared device-local room preferences. A document chooses its finish once.
export const ROOM_FINISHES=[
 ['walnut','Walnut paneling'],['denim','Faded denim'],['sunflower','Harvest wallpaper'],
 ['memphis','Memphis after school'],['cork','Cork & avocado'],
 ['speaker-cloth','Woven speaker cloth'],['shag','Burnt-orange shag'],
 ['ribbon','Harvest ribbon wallpaper'],['roller-rink','Roller-rink grid'],
 ['squiggles','Memphis notebook'],['paper','Faded TV listings'],
];
export const ROOM_EMBLEMS=[['autobot','Autobots'],['decepticon','Decepticons'],['cobra','Cobra']];
const documentStates=new WeakMap(),mountedSections=new WeakMap();
// Native bundling and the web entry can load separate module copies in one realm.
const DOCUMENT_STATE=Symbol.for('yata.room-appearance.state.v1'),SECTION_STATE=Symbol.for('yata.room-appearance.controls.v1');
const finishIds=new Set(ROOM_FINISHES.map(([id])=>id));
const emblemIds=new Set(['rotate','none',...ROOM_EMBLEMS.map(([id])=>id)]);
const sample=(count,random)=>{const value=Number(random());return Math.floor(Math.max(0,Math.min(.999999,Number.isFinite(value)?value:0))*count);};
export function pickFinish(previous,random=Math.random){const choices=ROOM_FINISHES.map(([id])=>id).filter(id=>id!==previous);return choices[sample(choices.length,random)];}
export function initializeAppearance({document:doc=globalThis.document,storage,random=Math.random}={}){
 if(!doc?.documentElement||!doc.body)throw Error('Room appearance requires a ready document.');
 if(doc[DOCUMENT_STATE])return doc[DOCUMENT_STATE];
 if(documentStates.has(doc))return documentStates.get(doc);
 if(storage===undefined){try{storage=doc.defaultView?.localStorage;}catch{}}
 const read=key=>{try{return storage?.getItem(key);}catch{return null;}};
 const save=(key,value)=>{try{storage?.setItem(key,value);}catch{}};
 const savedPin=read('yata-room-pinned');let pinned=finishIds.has(savedPin),finish=pinned?savedPin:pickFinish(read('yata-room-last'),random);
 let emblem=read('yata-room-emblem')||'rotate';if(!emblemIds.has(emblem))emblem='rotate';
 let decal=doc.getElementById('native-room-decal');if(!decal){decal=doc.createElement('div');decal.id='native-room-decal';decal.setAttribute('aria-hidden','true');doc.body.prepend(decal);}
 const listeners=new Set();
 const reflect=()=>{doc.documentElement.dataset.room=finish;save('yata-room-last',finish);for(const listener of listeners)listener();};
 const reflectEmblem=()=>{const chosen=emblem==='rotate'?ROOM_EMBLEMS[sample(ROOM_EMBLEMS.length,random)][0]:emblem;decal.hidden=chosen==='none';decal.style.backgroundImage=chosen==='none'?'':`url("assets/decor/${chosen}.svg")`;};
 const state={get finish(){return finish;},get pinned(){return pinned;},get emblem(){return emblem;},
  setFinish(value){if(!finishIds.has(value))return false;finish=value;if(pinned)save('yata-room-pinned',finish);reflect();return true;},
  setPinned(value){pinned=!!value;save('yata-room-pinned',pinned?finish:'');reflect();},
  setEmblem(value){if(!emblemIds.has(value))return false;emblem=value;save('yata-room-emblem',emblem);reflectEmblem();reflect();return true;},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
 };
 documentStates.set(doc,state);try{Object.defineProperty(doc,DOCUMENT_STATE,{value:state});}catch{}reflectEmblem();reflect();return state;
}
export function mountAppearance(section,options={}){
 if(!section)throw Error('Provide a section for appearance controls.');
 if(section[SECTION_STATE])return section[SECTION_STATE];
 if(mountedSections.has(section))return mountedSections.get(section);
 const doc=section.ownerDocument,state=initializeAppearance({...options,document:doc});
 const native=!!section.closest?.('#native-more'),prefix=native?'native-room':'room';
 section.classList.add('room-appearance-controls');
 const labeledSelect=(labelText,id,choices)=>{const label=doc.createElement('label'),text=doc.createElement('span'),select=doc.createElement('select');text.textContent=labelText;select.id=id;for(const[value,name]of choices){const option=doc.createElement('option');option.value=value;option.textContent=name;select.append(option);}label.append(text,select);section.append(label);return select;};
 const select=labeledSelect('Room finish',prefix+'-finish',ROOM_FINISHES);
 const pinLabel=doc.createElement('label'),pin=doc.createElement('input');pin.type='checkbox';pin.id=prefix+'-pin';pinLabel.className='room-pin';pinLabel.append(pin,' Keep this room on every visit');section.append(pinLabel);
 const emblem=labeledSelect('Vintage decal',prefix+'-emblem',[['rotate','Surprise me'],['none','No decal'],...ROOM_EMBLEMS]);
 const note=doc.createElement('p');note.className='native-room-note';note.textContent='Leave the room unpinned for a different finish on each fresh visit. It stays put while you watch.';section.append(note);
 const credits=doc.createElement('p');credits.className='native-room-note';credits.append('Vintage insignia: Transformers / G.I. Joe, Hasbro. ');const link=doc.createElement('a');link.href='assets/decor/credits.html';link.textContent='Image sources';credits.append(link);section.append(credits);
 const reflect=()=>{select.value=state.finish;pin.checked=state.pinned;emblem.value=state.emblem;};
 select.onchange=()=>state.setFinish(select.value);pin.onchange=()=>state.setPinned(pin.checked);emblem.onchange=()=>state.setEmblem(emblem.value);state.subscribe(reflect);reflect();mountedSections.set(section,state);try{Object.defineProperty(section,SECTION_STATE,{value:state});}catch{}return state;
}

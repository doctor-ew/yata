import test from'node:test';
import assert from'node:assert/strict';
import{pickFinish,ROOM_FINISHES,initializeAppearance}from'../mobile/appearance.mjs';

function fixture(saved={}){
 const values=new Map(Object.entries(saved)),nodes=new Map(),children=[];
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const doc={documentElement:{dataset:{}},defaultView:{localStorage:storage},getElementById:id=>nodes.get(id),createElement:()=>({style:{},setAttribute(){}}),body:{prepend(node){children.unshift(node);nodes.set(node.id,node);}}};
 return{doc,values,children,storage};
}
test('fresh launches avoid the previous finish and reach every other finish',()=>{
 const count=ROOM_FINISHES.length-1;
 for(const[previous]of ROOM_FINISHES){const seen=new Set();for(let i=0;i<count;i++)seen.add(pickFinish(previous,()=>i/count));assert.equal(seen.size,count);assert.ok(!seen.has(previous));}
});
test('a first launch always selects a known finish even with malformed random input',()=>{
 for(const random of[0,.2,.5,.999999,NaN,-1,1])assert.ok(ROOM_FINISHES.some(([id])=>id===pickFinish(null,()=>random)));
});
test('mounting web and native controls in one document never rerolls the room or duplicates the decal',()=>{
 const f=fixture();let samples=0;const options={document:f.doc,storage:f.storage,random:()=>{samples++;return .5;}};
 const first=initializeAppearance(options),finish=first.finish,second=initializeAppearance(options);
 assert.equal(first,second);assert.equal(samples,2);assert.equal(second.finish,finish);assert.equal(f.children.length,1);assert.match(f.children[0].style.backgroundImage,/assets\/decor\//);
});
test('pinning survives a fresh document, unpinning rotates, and invalid choices cannot corrupt preferences',()=>{
 const first=fixture(),state=initializeAppearance({document:first.doc,random:()=>0});assert.equal(state.setFinish('speaker-cloth'),true);state.setPinned(true);state.setEmblem('cobra');
 assert.equal(state.setFinish('unknown'),false);assert.equal(state.setEmblem('unknown'),false);assert.equal(state.finish,'speaker-cloth');
 const next=fixture(Object.fromEntries(first.values)),restored=initializeAppearance({document:next.doc,random:()=>0});assert.equal(restored.finish,'speaker-cloth');assert.equal(restored.pinned,true);assert.equal(restored.emblem,'cobra');
 restored.setPinned(false);const fresh=fixture(Object.fromEntries(next.values)),rotated=initializeAppearance({document:fresh.doc,random:()=>0});assert.notEqual(rotated.finish,'speaker-cloth');assert.equal(rotated.pinned,false);
});
test('blocked storage still permits changing the room and turning decals off',()=>{
 const f=fixture(),storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const state=initializeAppearance({document:f.doc,storage,random:()=>0});
 assert.equal(state.setFinish('roller-rink'),true);state.setPinned(true);assert.equal(state.setEmblem('none'),true);assert.equal(f.children[0].hidden,true);assert.equal(f.doc.documentElement.dataset.room,'roller-rink');
});

test('separate native and web module copies reuse the same document state',async()=>{const f=fixture(),first=initializeAppearance({document:f.doc,random:()=>0});const other=await import('../src/appearance.mjs?second-copy');const second=other.initializeAppearance({document:f.doc,random:()=>.9});assert.equal(first,second);assert.equal(f.children.length,1);});

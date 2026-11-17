import test from 'node:test';
import assert from 'node:assert/strict';
import{pickFinish,ROOM_FINISHES}from'../mobile/appearance.mjs';
test('fresh launches avoid the previous finish and reach every other finish',()=>{
 for(const[previous]of ROOM_FINISHES){const seen=new Set();for(let i=0;i<4;i++)seen.add(pickFinish(previous,()=>i/4));assert.equal(seen.size,4);assert.ok(!seen.has(previous));}
});
test('a first launch always selects a known finish',()=>{for(const random of[0,.2,.5,.999999])assert.ok(ROOM_FINISHES.some(([id])=>id===pickFinish(null,()=>random)));});

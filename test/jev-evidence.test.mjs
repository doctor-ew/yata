import test from'node:test';import assert from'node:assert/strict';
import{checkJevSelection}from'../src/jev-evidence.mjs';
const a='a'.repeat(64),b='b'.repeat(64),candidates=[{id:a,text:'Reviewed evidence A'},{id:b,text:'Reviewed evidence B'}];
test('Jev selections resolve only supplied finite evidence and ignore model text or actions',()=>{
 const result=checkJevSelection({exists:.98,top:[{id:a,probability:.97,text:'invented',url:'javascript:alert(1)',action:'play'},{id:b,probability:.02}]},candidates);
 assert.deepEqual(result,{status:'selected',evidenceIds:[a]});
 assert.equal(checkJevSelection({exists:.99,top:[{id:'c'.repeat(64),probability:1}]},candidates).status,'review');
});
test('No-answer, ambiguous, duplicate and malformed results cannot auto-select an episode',()=>{
 assert.equal(checkJevSelection({exists:.02,top:[{id:a,probability:.99}]},candidates).status,'unsupported');
 for(const raw of[{exists:.6,top:[{id:a,probability:.99}]},{exists:1,top:[{id:a,probability:.6},{id:b,probability:.4}]},{exists:1,top:[{id:a,probability:1},{id:a,probability:0}]},{exists:NaN,top:[]}])assert.equal(checkJevSelection(raw,candidates).status,'review');
});

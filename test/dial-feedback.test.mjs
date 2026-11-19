import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDialFeedback, DIAL_FEEDBACK_STORAGE_KEY } from '../src/dial-feedback.mjs';

function fixture({saved=null, volume=1, muted=false, state='running', unavailable=false, brokenStorage=false, createError=false, resumeError=false, nodeError=false, pendingResume=false}={}) {
  const contexts=[],writes=[],pulses=[];let resumeResolve;
  class Node {
    connections=[]; disconnected=false; gain={value:1}; frequency={value:0}; Q={value:0};
    connect(node){this.connections.push(node);return node;}
    disconnect(){this.disconnected=true;}
    start(time){this.started=time;}
    stop(time){this.stopped=time??0;this.stopCalls=(this.stopCalls||0)+1;}
  }
  class AudioContext {
    state=state;sampleRate=48000;currentTime=4;destination={};nodes=[];buffers=[];resumeCalls=0;closeCalls=0;
    constructor(){if(createError)throw Error('blocked');contexts.push(this);}
    resume(){this.resumeCalls++;if(resumeError)return Promise.reject(Error('blocked'));if(pendingResume)return new Promise(resolve=>{resumeResolve=()=>{this.state='running';resolve();};});this.state='running';return Promise.resolve();}
    close(){this.closeCalls++;this.state='closed';return Promise.resolve();}
    createBuffer(channels,length,sampleRate){const data=new Float32Array(length),buffer={channels,length,sampleRate,data,getChannelData(channel){assert.equal(channel,0);return data;}};this.buffers.push(buffer);return buffer;}
    createBufferSource(){const node=new Node();node.kind='source';this.nodes.push(node);return node;}
    createBiquadFilter(){if(nodeError)throw Error('filter failure');const node=new Node();node.kind='filter';this.nodes.push(node);return node;}
    createGain(){const node=new Node();node.kind='gain';this.nodes.push(node);return node;}
  }
  const windowRef=unavailable?{}:{AudioContext};const toggle=new EventTarget();toggle.checked=false;
  const stateRef={volume,muted};
  const storage={getItem(key){assert.equal(key,DIAL_FEEDBACK_STORAGE_KEY);if(brokenStorage)throw Error('blocked');return saved;},setItem(key,value){if(brokenStorage)throw Error('full');writes.push([key,JSON.parse(value)]);}};
  const controls=mountDialFeedback({windowRef,storage,toggle,getVolume:()=>stateRef.volume,getMuted:()=>stateRef.muted,pulse:()=>pulses.push('pulse')});
  const change=value=>{toggle.checked=value;toggle.dispatchEvent(new Event('change'));};
  return {contexts,writes,pulses,controls,toggle,stateRef,change,resume:()=>resumeResolve?.()};
}

test('dial feedback defaults on without creating audio until a gesture; saved boolean preferences are validated',async()=>{
  for(const saved of[null,'{','{"enabled":"false"}','[]','"false"']){const f=fixture({saved});assert.equal(f.toggle.checked,true);assert.equal(f.contexts.length,0);f.controls.dispose();}
  for(const saved of['false','{"enabled":false}']){const f=fixture({saved});assert.equal(f.toggle.checked,false);assert.equal(await f.controls.play(),false);assert.equal(f.pulses.length,0);assert.equal(f.contexts.length,0);f.controls.dispose();}
  const f=fixture();assert.equal(f.contexts.length,0);assert.equal(await f.controls.play(),true);assert.equal(f.contexts.length,1);assert.equal(f.pulses.length,1);
  f.change(false);assert.deepEqual(f.writes.at(-1),[DIAL_FEEDBACK_STORAGE_KEY,{enabled:false}]);assert.equal(await f.controls.play(),false);f.controls.dispose();
});

test('sound follows media mute and volume while visual feedback remains available',async()=>{
  for(const options of[{muted:true},{volume:0},{volume:-1},{volume:NaN},{volume:Infinity}]){const f=fixture(options);assert.equal(await f.controls.play(),false);assert.equal(f.contexts.length,0);assert.equal(f.pulses.length,1);f.controls.dispose();}
  const levels=[];
  for(const volume of[.1,.5,1,4]){const f=fixture({volume});assert.equal(await f.controls.play(),true);const gain=f.contexts[0].nodes.find(node=>node.kind==='gain').gain.value;levels.push(gain);assert.ok(gain>0&&gain<=.12);f.controls.dispose();}
  assert.deepEqual(levels,[.012,.06,.12,.12]);
});

test('procedural sound is finite, filtered and low amplitude, and graphs disconnect on ended',async()=>{
  const f=fixture();await f.controls.play();const context=f.contexts[0],source=context.nodes.find(node=>node.kind==='source'),buffer=context.buffers[0];
  assert.equal(buffer.channels,1);assert.ok(buffer.length/buffer.sampleRate<=.241);assert.equal(source.loop,false);
  assert.ok(buffer.data.every(sample=>Number.isFinite(sample)&&Math.abs(sample)<=1));assert.equal(buffer.data[0],0);
  assert.ok(source.stopped-source.started<=.241);assert.deepEqual(context.nodes.filter(node=>node.kind==='filter').map(node=>node.type),['highpass','lowpass']);
  source.onended();assert.ok(context.nodes.every(node=>node.disconnected));assert.equal(source.onended,null);f.controls.dispose();
});

test('rapid dial gestures reuse one owned context and stop old nodes without piling up graphs',async()=>{
  const f=fixture();await f.controls.play();const context=f.contexts[0],oldNodes=context.nodes.slice(),oldSource=oldNodes[0];
  await f.controls.play();assert.equal(f.contexts.length,1);assert.ok(oldNodes.every(node=>node.disconnected));assert.ok(oldSource.stopCalls>=2);
  assert.equal(context.nodes.filter(node=>!node.disconnected).length,4);
  f.controls.dispose();assert.ok(context.nodes.every(node=>node.disconnected));assert.equal(context.closeCalls,1);
  f.change(true);assert.equal(await f.controls.play(),false);assert.equal(context.closeCalls,1);f.controls.dispose();assert.equal(context.closeCalls,1);
});

test('audio API failures are quiet and leave visual feedback working',async()=>{
  for(const options of[{unavailable:true},{createError:true},{state:'suspended',resumeError:true},{nodeError:true},{brokenStorage:true,unavailable:true}]){
    const f=fixture(options);assert.equal(await f.controls.play(),false);assert.equal(f.pulses.length,1);
    assert.ok(f.contexts.every(context=>context.nodes.every(node=>node.disconnected)));f.controls.dispose();
  }
  const f=fixture({brokenStorage:true});f.change(false);assert.equal(await f.controls.play(),false);f.change(true);assert.equal(await f.controls.play(),true);f.controls.dispose();
});

test('suspended contexts resume on a gesture and stale resumes cannot create sound after disable or dispose',async()=>{
  const normal=fixture({state:'suspended'});assert.equal(await normal.controls.play(),true);assert.equal(normal.contexts[0].resumeCalls,1);normal.controls.dispose();
  for(const action of['disable','dispose','mute']){
    const f=fixture({state:'suspended',pendingResume:true}),pending=f.controls.play();assert.equal(f.contexts[0].nodes.length,0);
    if(action==='disable')f.change(false);else if(action==='dispose')f.controls.dispose();else f.stateRef.muted=true;
    f.resume();assert.equal(await pending,false);assert.equal(f.contexts[0].nodes.length,0);f.controls.dispose();
  }
});

test('channel tuning can play sound without restarting the visual snow, while mute still wins',async()=>{
 const f=fixture();assert.equal(await f.controls.play({visual:false}),true);assert.equal(f.pulses.length,0);assert.equal(f.contexts.length,1);f.controls.dispose();
 const muted=fixture({muted:true});assert.equal(await muted.controls.play({visual:false}),false);assert.equal(muted.contexts.length,0);assert.equal(muted.pulses.length,0);muted.controls.dispose();
});

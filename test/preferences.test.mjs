import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCommercialDefaults, markCommercialPreference, COMMERCIAL_DEFAULTS_STORAGE_KEY } from '../src/preferences.mjs';
const catalog = bumpers => ({ settings: { bumpers, channel: 'mixed' }, shows: [{id:'show'}] });
function fixture() {
  const data = new Map(), events = [];
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => {events.push('marker');data.set(key,value);} };
  return {data, events, storage};
}
test('commercial default migration saves an immutable change before recording completion', () => {
  const f=fixture(), original=catalog(false);
  const result=applyCommercialDefaults(original,f.storage,next=>{f.events.push('catalog');assert.equal(next.settings.bumpers,true);return true;});
  assert.equal(original.settings.bumpers,false);assert.notEqual(result.catalog,original);assert.notEqual(result.catalog.settings,original.settings);
  assert.equal(result.catalog.shows,original.shows);assert.equal(result.changed,true);assert.equal(result.markerRecorded,true);
  assert.deepEqual(f.events,['catalog','marker']);assert.equal(f.data.get(COMMERCIAL_DEFAULTS_STORAGE_KEY),'1');
});
test('recorded migration and later explicit Off choice remain Off', () => {
  const f=fixture();assert.equal(markCommercialPreference(f.storage),true);
  const original=catalog(false);const result=applyCommercialDefaults(original,f.storage,()=>{throw Error('must not save');});
  assert.equal(result.catalog,original);assert.equal(result.changed,false);assert.equal(result.markerRecorded,true);
});
test('already enabled catalog records completion without rewriting catalog', () => {
  const f=fixture(), original=catalog(true);const result=applyCommercialDefaults(original,f.storage,()=>{throw Error('must not save');});
  assert.equal(result.catalog,original);assert.equal(result.changed,false);assert.equal(result.markerRecorded,true);
});
test('failed catalog save never records completion or changes the returned catalog', () => {
  for(const save of [()=>false,()=>{throw Error('blocked');}]){
    const f=fixture(),original=catalog(false),result=applyCommercialDefaults(original,f.storage,save);
    assert.equal(result.catalog,original);assert.equal(result.changed,false);assert.equal(f.data.size,0);
  }
});
test('blocked storage leaves saved Off unchanged across repeated loads', () => {
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const original=catalog(false);for(let i=0;i<2;i++){
    const result=applyCommercialDefaults(original,storage,()=>{throw Error('must not save');});assert.equal(result.catalog,original);assert.equal(result.changed,false);
  }assert.equal(markCommercialPreference(storage),false);
});
test('marker write failure rolls back the persisted change instead of overriding Off on every load', () => {
  const storage={getItem:()=>null,setItem(){throw Error('marker blocked');}};const original=catalog(false);let persisted=original;
  for(let i=0;i<2;i++){
    const result=applyCommercialDefaults(persisted,storage,next=>{persisted=next;return true;});
    assert.equal(result.catalog,original);assert.equal(persisted,original);assert.equal(result.changed,false);assert.equal(result.markerRecorded,false);
  }
});
test('reports the actual catalog if both completion recording and rollback fail', () => {
  const storage={getItem:()=>null,setItem(){throw Error('blocked');}};let calls=0;
  const result=applyCommercialDefaults(catalog(false),storage,()=>++calls===1);
  assert.equal(result.catalog.settings.bumpers,true);assert.equal(result.changed,true);assert.equal(result.markerRecorded,false);
});

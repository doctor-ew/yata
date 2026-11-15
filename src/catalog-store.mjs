import {readCatalog,validateCatalog,MAX_IMPORT_BYTES,STORAGE_KEY} from './domain.mjs';
import {openBrowserCatalogDatabase} from './catalog-database.mjs';
// Notifications improve recovery UX; IndexedDB transactions enforce correctness.
export const CATALOG_CHANGE_CHANNEL='yata.owner-catalog.changes.v1';
export class CatalogConflict extends Error {
  constructor(){super('Another tab saved a newer catalog. Your change was not written. Export this tab’s changes before reloading the saved catalog.');this.name='CatalogConflict';}
}
export async function openCatalogStore({storage,seed,database}) {
  let loaded=readCatalog(storage,seed,{persistMigration:false}), current=loaded.catalog, revision=null, writable=false, stale=false, legacy;
  const listeners=new Set();let db;
  try {legacy=storage.getItem(STORAGE_KEY);}catch{/* Legacy recovery data is never overwritten. */}
  try {
    db=database||await openBrowserCatalogDatabase();
    const record=await db.initialize(loaded.error?null:current);
    if(record){current=validateCatalog(record.catalog);revision=record.revision;loaded={catalog:current,error:null};}
    writable=true;
  }catch{/* Playback and export remain available without transactional storage. */}
  let channel=null;
  try{if(typeof window!=='undefined'&&globalThis.BroadcastChannel)channel=new BroadcastChannel(CATALOG_CHANGE_CHANNEL);}catch{/* Notifications are optional; transactions still enforce conflicts. */}
  if(channel)channel.onmessage=event=>{if(Number.isSafeInteger(event.data?.revision)&&event.data.revision>(revision??0)){stale=true;for(const callback of listeners)callback();}};
  return {
    loaded,writable,get catalog(){return current;},
    async save(next,base=current){
      if(!writable)throw Error('Catalog changes are read-only because transactional storage is unavailable. Playback and export remain available.');
      const expected=revision;if(base!==current)throw new CatalogConflict();
      const valid=validateCatalog(next);
      if(new TextEncoder().encode(JSON.stringify(valid)).length>MAX_IMPORT_BYTES)throw Error('Catalog exceeds the 4 MB storage limit.');
      let record;
      try{record=await db.compareAndSave(expected,valid);}catch(error){if(error.code==='CATALOG_CONFLICT')throw new CatalogConflict();throw error;}
      current=record.catalog;revision=record.revision;stale=false;channel?.postMessage({revision});return current;
    },
    isStale(){try{return stale||storage.getItem(STORAGE_KEY)!==legacy;}catch{return stale;}},
    async checkForChanges(){if(!writable)return;try{const record=await db.read();if(record?.revision!==revision){stale=true;for(const callback of listeners)callback();}}catch{/* A failed status read never replaces the draft. */}},
    subscribe(callback){listeners.add(callback);return()=>listeners.delete(callback);},
  };
}

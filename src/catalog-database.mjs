export const OWNER_DATABASE_NAME='yata.owner-catalog.v1';
const STORE='catalogs', KEY='main';
export async function openBrowserCatalogDatabase(factory=globalThis.indexedDB) {
  if(!factory?.open)throw Error('Transactional catalog storage is unavailable.');
  const db=await new Promise((resolve,reject)=>{
    const request=factory.open(OWNER_DATABASE_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(Error('Transactional catalog storage could not be opened.'));
    request.onblocked=()=>reject(Error('Close older owner tabs to open catalog storage.'));
  });
  db.onversionchange=()=>db.close();
  function transact(mode,operation){
    return new Promise((resolve,reject)=>{
      let result, failure;
      const tx=db.transaction(STORE,mode), store=tx.objectStore(STORE);
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(failure||Error('The catalog transaction failed. The prior saved catalog is unchanged.'));
      operation(store,value=>{result=value;},error=>{failure=error;tx.abort();});
    });
  }
  return {
    read:()=>transact('readonly',(store,done)=>{const get=store.get(KEY);get.onsuccess=()=>done(get.result||null);}),
    initialize:initial=>transact('readwrite',(store,done)=>{
      const get=store.get(KEY);get.onsuccess=()=>{if(get.result){done(get.result);return;}if(!initial){done(null);return;}const value={revision:1,catalog:initial};store.put(value,KEY);done(value);};
    }),
    compareAndSave:(revision,catalog)=>transact('readwrite',(store,done,abort)=>{
      const get=store.get(KEY);get.onsuccess=()=>{
        if((get.result?.revision??null)!==revision){const error=Error('Another tab saved a newer catalog.');error.code='CATALOG_CONFLICT';abort(error);return;}
        const value={revision:(revision??0)+1,catalog};store.put(value,KEY);done(value);
      };
    }),
    close:()=>db.close(),
  };
}

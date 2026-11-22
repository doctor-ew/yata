export const MAX_SAVED_LINEUPS=50;
export function validateSavedLineups(value,showIds){
 if(!Array.isArray(value)||value.length>MAX_SAVED_LINEUPS)throw Error('Save up to 50 personal lineups. Remove one before adding another.');
 const ids=new Set();
 return value.map(item=>{
  if(!item||typeof item.id!=='string'||!/^[\w.-]{1,160}$/.test(item.id)||ids.has(item.id)||typeof item.title!=='string'||!item.title.trim()||item.title.length>80||!Array.isArray(item.showIds)||!item.showIds.length||item.showIds.length>12||new Set(item.showIds).size!==item.showIds.length||item.showIds.some(id=>typeof id!=='string'||!showIds.has(id))||!Number.isInteger(item.seed)||item.seed<0||item.seed>4294967295||!Number.isFinite(item.epoch)||item.epoch<0||!['random','ordered'].includes(item.rotation))throw Error('Invalid saved personal lineup.');
  ids.add(item.id);return {id:item.id,title:item.title.trim(),showIds:[...item.showIds],seed:item.seed,epoch:item.epoch,rotation:item.rotation};
 });
}
export function savedLineups(catalog){
 const s=catalog.settings,items=(s.savedLineups||[]).map(item=>({...item,showIds:[...item.showIds]}));
 const current=s.customShows??s.streamShows;
 if(current?.length){const item={id:s.activeLineupId||'legacy',title:s.customTitle||'Your Channel',showIds:[...current],seed:s.customSeed??s.shuffleSeed,epoch:s.customEpoch??catalog.epoch,rotation:s.customRotation??s.rotation};const index=items.findIndex(i=>i.id===item.id);if(index<0)items.push(item);else items[index]=item;}
 return items;
}
export function selectSavedLineup(catalog,lineupId){
 const items=savedLineups(catalog),item=items.find(i=>i.id===lineupId);if(!item)throw Error('That saved lineup is no longer available.');
 return {...catalog,settings:{...catalog.settings,savedLineups:items,activeLineupId:item.id,channel:'mixed',streamShow:null,streamShows:[...item.showIds],customShows:[...item.showIds],customTitle:item.title,customSeed:item.seed,customEpoch:item.epoch,customRotation:item.rotation,customMode:'shows',customQueueActive:false}};
}
export function removeSavedLineup(catalog,lineupId){
 const items=savedLineups(catalog).filter(i=>i.id!==lineupId),s={...catalog.settings,savedLineups:items};
 if((s.activeLineupId||'legacy')===lineupId){for(const key of ['activeLineupId','customShows','customTitle','customSeed','customEpoch','customRotation','streamShows'])delete s[key];}
 return {...catalog,settings:s};
}

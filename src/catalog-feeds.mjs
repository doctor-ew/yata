// Public read-only card feeds. Private provider catalogs must use separate authenticated adapters.
const ID=/^[a-z0-9][a-z0-9.-]{0,159}$/;
const safeText=(value,max=1000)=>typeof value==='string'&&value.length<=max?value:'';
export function validateArtworkFeed(raw,{assetBase}={}){
 if(raw?.version!==1||!raw.shows||Array.isArray(raw.shows)||typeof raw.shows!=='object'||Object.keys(raw.shows).length>2000)throw Error('Invalid artwork catalog.');
 const shows=Object.create(null);
 for(const[id,item]of Object.entries(raw.shows)){
  if(!ID.test(id)||!item||typeof item!=='object')throw Error('Invalid artwork entry.');
  const clean={title:safeText(item.title,500),genres:Array.isArray(item.genres)?item.genres.filter(g=>typeof g==='string'&&g.length<=80).slice(0,20):[]};
  for(const key of['premiered','ended','type','imageRole'])if(item[key])clean[key]=safeText(item[key],80);
  if(Number.isInteger(item.year)&&item.year>=1900&&item.year<=2200)clean.year=item.year;
  if(Number.isInteger(item.tvmazeId)&&item.tvmazeId>0)clean.tvmazeId=item.tvmazeId;
  for(const key of['sourceUrl','imageSource','imageCreditUrl']){if(!item[key])continue;const u=new URL(item[key]);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid artwork reference.');clean[key]=u.href;}
  for(const key of['image','logo']){if(!item[key])continue;if(!/^assets\/show-art\/[a-z0-9-]+\.(webp|jpg|png)$/.test(item[key]))throw Error('Invalid artwork asset path.');clean[key]=assetBase?new URL(item[key],assetBase).href:item[key];clean[key+'Fallback']=item[key];}
  shows[id]=clean;
 }
 return {version:1,shows};
}
export function validateGameMetadata(raw){
 if(raw?.version!==1||!Array.isArray(raw.games)||raw.games.length>2000)throw Error('Invalid game catalog.');
 const ids=new Set();
 const games=raw.games.map(g=>{
  if(!ID.test(g?.id)||ids.has(g.id)||!safeText(g.title,300)||!['console','flash'].includes(g.category)||!['installed','needs-work','needs-recovery'].includes(g.status))throw Error('Invalid game entry.');
  ids.add(g.id);return{id:g.id,title:g.title,category:g.category,status:g.status,hint:safeText(g.hint,500),reason:safeText(g.reason,1000)};
 });return{version:1,games};
}
function browserStorage(){try{return globalThis.localStorage;}catch{return null;}}
async function boundedFeedText(response){
 if(!response.body?.getReader){const text=await response.text();if(new TextEncoder().encode(text).length>2000000)throw Error('Feed too large.');return text;}
 const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,text='';
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw Error('Feed too large.');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}
 finally{reader.releaseLock();}
}
export async function fetchPublicFeed({url,validate,bundled,cacheKey,fetcher=globalThis.fetch,storage=browserStorage()}){
 try{
  const response=await fetcher(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
  if(!response.ok||Number(response.headers?.get('content-length'))>2000000)throw Error('Feed unavailable.');
  const text=await boundedFeedText(response);
  const raw=JSON.parse(text),data=validate(raw);
  try{storage?.setItem(cacheKey,text);}catch{/* Read access remains usable when cache storage is unavailable. */}
  return{data,source:'network'};
 }catch{
  try{const text=storage?.getItem(cacheKey);if(text&&text.length<=2000000)return{data:validate(JSON.parse(text)),source:'cache'};}catch{}
  if(bundled!==undefined)return{data:validate(bundled),source:'bundle'};
  throw Error('No valid public catalog is available.');
 }
}
export async function refreshGameMetadata(target,options={}){
 const result=await fetchPublicFeed({url:new URL('../data/arcade-games.json',import.meta.url),validate:validateGameMetadata,bundled:{version:1,games:target},cacheKey:'yata.public-games.v1',...options});
 target.splice(0,target.length,...result.data.games);return result;
}

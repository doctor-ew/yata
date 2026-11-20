// Presentation data only. Server-side approved personalities remain authoritative.
import{BUDDY_PERSONAS}from'./buddy-personas.mjs';
import{BUDDY_QUIPS}from'./buddy-quips.mjs';
import{fetchPublicFeed}from'./catalog-feeds.mjs';
export const BUDDY_FEED_PATH='data/buddy-personas.json';
export const BUDDY_FEED_CACHE='yata.buddy-roster.v1';
const bundled={version:1,personas:BUDDY_PERSONAS.map(p=>({...structuredClone(p),arcade:p.arcade===true,aliases:p.aliases||[],quips:BUDDY_QUIPS[p.id]||[]}))};
const profileKeys=new Set(['id','name','personality','traits','image','credit','greeting','channels','aliases','arcade','quips']);
const listeners=new Set();
const clean=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
export function validateBuddyFeed(raw){
 if(new TextEncoder().encode(JSON.stringify(raw)).length>250000)throw Error('Buddy roster too large.');
 if(!raw||Object.keys(raw).some(k=>!['version','personas'].includes(k))||raw.version!==1||!Array.isArray(raw.personas)||!raw.personas.length||raw.personas.length>200)throw Error('Invalid buddy roster.');
 const ids=new Set(),names=new Map();
 const personas=raw.personas.map(p=>{
  if(!p||typeof p!=='object'||Object.keys(p).some(k=>!profileKeys.has(k))||!/^[a-z][a-z0-9-]{0,15}$/.test(p.id)||ids.has(p.id)||p.personality!==p.id||!clean(p.name,80)||!clean(p.traits,1000)||!clean(p.greeting,500)||typeof p.arcade!=='boolean'||!/^assets\/buddy\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/.test(p.image)||!Array.isArray(p.channels)||!p.channels.length||p.channels.length>32||p.channels.some(c=>typeof c!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(c)||['mixed','custom','arcade','constructor','prototype'].includes(c))||!Array.isArray(p.aliases)||p.aliases.length>16||p.aliases.some(a=>!clean(a,80))||!Array.isArray(p.quips)||p.quips.length>8||p.quips.some(q=>!clean(q,300)))throw Error('Invalid buddy profile.');
  const credit=new URL(p.credit);if(!['https:','http:'].includes(credit.protocol)||credit.username||credit.password)throw Error('Invalid portrait credit.');
  for(const n of[p.id,p.name,...p.aliases]){const key=n.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');if(!key||names.has(key)&&names.get(key)!==p.id)throw Error('Ambiguous buddy alias.');names.set(key,p.id);}
  ids.add(p.id);return{id:p.id,name:p.name,personality:p.id,traits:p.traits,image:p.image,credit:credit.href,greeting:p.greeting,channels:[...new Set(p.channels)],aliases:[...new Set(p.aliases)],arcade:p.arcade,quips:[...new Set(p.quips)]};
 });
 if(!personas.some(p=>p.arcade))throw Error('Arcade roster is empty.');
 return{version:1,personas};
}
export function bundledBuddyFeed(){return structuredClone(bundled);}
export function applyBuddyFeed(raw){const feed=validateBuddyFeed(raw);BUDDY_PERSONAS.splice(0,BUDDY_PERSONAS.length,...feed.personas.map(p=>({...p,imageUrl:new URL(p.image,'https://doctorew.com/tv/').href,imageFallback:bundled.personas.find(b=>b.id===p.id)?.image||''})));for(const fn of listeners)fn(BUDDY_PERSONAS);return feed;}
export function subscribeBuddyRoster(fn){listeners.add(fn);return()=>listeners.delete(fn);}
let cached=false,pending;
export function initializeBuddyRoster(storage){if(cached)return;cached=true;try{storage??=globalThis.localStorage;const text=storage?.getItem(BUDDY_FEED_CACHE);if(text&&text.length<=250000)applyBuddyFeed(JSON.parse(text));}catch{/* Bundled roster stays usable. */}}
export async function refreshBuddyRoster(options={}){if(pending)return pending;pending=(async()=>{const result=await fetchPublicFeed({url:new URL('../'+BUDDY_FEED_PATH,import.meta.url),validate:validateBuddyFeed,bundled,cacheKey:BUDDY_FEED_CACHE,...options});applyBuddyFeed(result.data);return result;})().finally(()=>{pending=null;});return pending;}

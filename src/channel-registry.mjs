// Data-only channel contract: no URLs, code, actions or arbitrary CSS are accepted.
import{DEFAULT_CHANNELS}from'./channel-defaults.mjs';
export const CHANNEL_REGISTRY_CAPABILITY='channel-registry-v1';
export const MAX_CHANNELS=32;
const reserved=new Set(['all','none','library','movies','custom','arcade','__proto__','constructor','prototype']);
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f<>]/.test(v);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&Object.keys(o).every(k=>keys.includes(k));
export function defaultChannelRegistry(){return{version:1,channels:DEFAULT_CHANNELS.map(c=>({...c,fallback:c.id}))};}
export function validateChannelRegistry(raw){
 if(!exact(raw,['version','channels'])||raw.version!==1||!Array.isArray(raw.channels)||raw.channels.length<DEFAULT_CHANNELS.length||raw.channels.length>MAX_CHANNELS)throw Error('Invalid channel registry.');
 const ids=new Set(),numbers=new Set(),defaults=new Map(DEFAULT_CHANNELS.map(c=>[c.id,c]));
 const channels=raw.channels.map(c=>{
  if(!exact(c,['id','number','name','subtitle','accent','fallback'])||typeof c.id!=='string'||!/^[a-z][a-z0-9-]{0,31}$/.test(c.id)||reserved.has(c.id)||ids.has(c.id)||typeof c.number!=='string'||!/^(?!00$|03$)\d{2}$/.test(c.number)||numbers.has(c.number)||!text(c.name,80)||!text(c.subtitle,160)||typeof c.accent!=='string'||!/^#[a-f0-9]{6}$/i.test(c.accent)||!defaults.has(c.fallback)||c.id!=='mixed'&&c.fallback==='mixed')throw Error('Invalid channel definition.');
  if(defaults.has(c.id)&&(c.number!==defaults.get(c.id).number||c.fallback!==c.id))throw Error('Reserved channel identity changed.');
  ids.add(c.id);numbers.add(c.number);return{id:c.id,number:c.number,name:c.name.trim(),subtitle:c.subtitle.trim(),accent:c.accent.toLowerCase(),fallback:c.fallback};
 });
 if(DEFAULT_CHANNELS.some(c=>!ids.has(c.id))||channels[0].id!=='mixed')throw Error('Missing bootstrap channel identity.');
 return{version:1,channels};
}
export function assertRegistryEvolution(previous,next){
 const before=validateChannelRegistry(previous),after=validateChannelRegistry(next),byId=new Map(after.channels.map(c=>[c.id,c]));
 for(const c of before.channels){const retained=byId.get(c.id);if(!retained||retained.number!==c.number||retained.fallback!==c.fallback)throw Error('Published channel identities are append-only; retain their number and fallback.');}
 return after;
}
export function compatibilityCatalog(catalog){
 const registry=validateChannelRegistry(catalog.channelRegistry);const fallback=new Map(registry.channels.map(c=>[c.id,c.fallback]));const legacyIds=new Set(DEFAULT_CHANNELS.map(c=>c.id));const next=structuredClone(catalog);delete next.channelRegistry;delete next.publishedRevision;
 for(const s of next.shows){s.channel=s.legacyChannel??fallback.get(s.channel);delete s.legacyChannel;if(!legacyIds.has(s.channel)||s.channel==='mixed')throw Error('Invalid legacy channel projection.');}
 next.settings.channel=fallback.get(next.settings.channel)??'mixed';
 if(next.settings.mixChannels)next.settings.mixChannels=[...new Set(next.settings.mixChannels.map(id=>fallback.get(id)))];
 if(next.settings.channelRemixes)next.settings.channelRemixes=Object.fromEntries(Object.entries(next.settings.channelRemixes).filter(([id])=>legacyIds.has(id)));
 return next;
}

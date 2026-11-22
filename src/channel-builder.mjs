import{subscribeBuddyRoster}from'./buddy-registry.mjs';
import{normalizeBuddyReply}from'./buddy-reply.mjs';
import {availableDialShows} from './dials.mjs';
import{BUDDY_PERSONAS}from'./buddy-personas.mjs';
export const CHANNEL_HOSTS=BUDDY_PERSONAS.map(({id,name})=>({id,name}));
export const HOST_PORTRAITS=Object.fromEntries(BUDDY_PERSONAS.map(p=>[p.id,{src:p.imageUrl||p.image,fallback:p.imageFallback||'',caption:p.name,credit:p.credit}]));
export function chooseHost(previous=null, random=Math.random) {
  const choices=CHANNEL_HOSTS.filter(host=>host.id!==previous);
  const sample=random();
  return choices[Math.floor(Math.max(0,Math.min(0.999999,Number.isFinite(sample)?sample:0))*choices.length)];
}
export function channelOffer(catalog) {
  return availableDialShows({...catalog,settings:{...catalog.settings,mixChannels:null}},'mixed').map(({id,title,channel})=>({id,title,channel}));
}
export function validateChannelPlan(plan,catalog,host) {
  const offered=new Set(channelOffer(catalog).map(show=>show.id));
  if(!plan||plan.host!==host||!CHANNEL_HOSTS.some(item=>item.id===host)||typeof plan.title!=='string'||!plan.title.trim()||plan.title.length>80||typeof plan.intro!=='string'||plan.intro.length>700||!Array.isArray(plan.showIds)||plan.showIds.length>12||new Set(plan.showIds).size!==plan.showIds.length||plan.showIds.some(id=>!offered.has(id))) throw Error('The lineup no longer matches the checked catalog. Ask the host again.');
  return {title:plan.title.trim(),intro:normalizeBuddyReply(plan.intro),host,showIds:[...plan.showIds]};
}

subscribeBuddyRoster(personas=>{CHANNEL_HOSTS.splice(0,CHANNEL_HOSTS.length,...personas.map(({id,name})=>({id,name})));for(const key of Object.keys(HOST_PORTRAITS))delete HOST_PORTRAITS[key];Object.assign(HOST_PORTRAITS,Object.fromEntries(personas.map(p=>[p.id,{src:p.imageUrl||p.image,fallback:p.imageFallback||'',caption:p.name,credit:p.credit}])));});

// Availability is resolved against checked metadata, never generated title claims.
export function channelPlanReview(question,plan,catalog){
 const offered=channelOffer(catalog),selected=plan.showIds.map(id=>offered.find(s=>s.id===id)).filter(Boolean);
 const target=String(question).trim().replace(/^(?:please\s+)?(?:make|create|build|assemble)(?:\s+(?:me|us))?\s+(?:(?:a|my|our|new|personal)\s+)?(?:tv\s+)?(?:channel|lineup|stream)\s*(?:(?:with|of|from|featuring|about|based on)\s+)?/i,'').replace(/^(?:play|watch|put on)\s+/i,'');
 const parts=target.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,12);
 const normalize=s=>s.toLowerCase().replace(/&/g,' and ').replace(/\b(?:the|animated|series)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
 const matches=part=>offered.filter(s=>normalize(s.title)===normalize(part));
 const explicitList=parts.length>1,unmatched=explicitList?parts.filter(part=>!matches(part).length):[];
 const requestedIds=new Set(parts.flatMap(part=>matches(part).map(s=>s.id)));
 const omitted=offered.filter(s=>requestedIds.has(s.id)&&!plan.showIds.includes(s.id));
 const alternatives=explicitList?selected.filter(s=>!requestedIds.has(s.id)):[];
 const lines=[];
 if(unmatched.length)lines.push(`I couldn’t match these requests to playable titles in the current checked catalog: ${unmatched.join('; ')}. They aren’t included in this lineup.`);
 if(omitted.length)lines.push(`These requested titles are available but weren’t selected: ${omitted.map(s=>s.title).join('; ')}.`);
 if(alternatives.length)lines.push(`Suggested alternatives: ${alternatives.map(s=>s.title).join('; ')}. These are suggestions, not the requested shows.`);
 if(selected.length)lines.push(`Proposed lineup: ${selected.map(s=>s.title).join('; ')}. Review it before saving. Your current channel and playback stay unchanged until you accept.`);
 else lines.push('No playable lineup was selected. Your current channel is unchanged.');
 return lines.join('\n\n');
}

import{normalizeBuddyReply}from'./buddy-reply.mjs';
import {availableDialShows} from './dials.mjs';
import{BUDDY_PERSONAS}from'./buddy-personas.mjs';
export const CHANNEL_HOSTS=BUDDY_PERSONAS.map(({id,name})=>({id,name}));
export const HOST_PORTRAITS=Object.fromEntries(BUDDY_PERSONAS.map(p=>[p.id,{src:p.image,caption:p.name,credit:p.credit}]));
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

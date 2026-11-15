import {availableDialShows} from './dials.mjs';
export const CHANNEL_HOSTS = [
  {id:'stubing',name:'Captain Stubing'}, {id:'arnold',name:'Arnold Jackson'},
  {id:'jabberjaw',name:'Jabberjaw'}, {id:'benson',name:'Benson'},
  {id:'mrt',name:'Mr. T'}, {id:'murdock',name:'Murdock'},
  {id:'twiki',name:'Twiki'}, {id:'starbuck',name:'Starbuck'},
];
export const HOST_PORTRAITS = {
  jabberjaw:{src:'https://doctorew.com/host-portraits/jabberjaw-character-v1.jpg',caption:"Jabberjaw \u00b7 original Hanna-Barbera series"},
  twiki:{src:'https://doctorew.com/host-portraits/twiki-character-v1.jpg',caption:"Twiki with Dr. Theopolis \u00b7 Buck Rogers"},
  stubing:{src:'https://doctorew.com/host-portraits/stubing-character-v1.jpg',caption:"Gavin MacLeod as Captain Stubing"},
  arnold:{src:'https://doctorew.com/host-portraits/arnold-character-v1.jpg',caption:"Gary Coleman as Arnold Jackson"},
  benson:{src:'https://doctorew.com/host-portraits/benson.jpg',caption:'Robert Guillaume as Benson'},
  mrt:{src:'https://doctorew.com/host-portraits/mrt-character-v1.png',caption:"Mr. T as B. A. Baracus \u00b7 existing portfolio artwork"},
  starbuck:{src:'https://doctorew.com/host-portraits/starbuck-character-v1.jpg',caption:"Dirk Benedict as Starbuck, 1978"},
  murdock:{src:'https://www.doctorew.com/assets/gpt_personalities/murdock.png',caption:'Murdock · existing portfolio artwork'},
};
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
  return {title:plan.title.trim(),intro:plan.intro,host,showIds:[...plan.showIds]};
}

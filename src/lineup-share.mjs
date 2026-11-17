import{episodeQueueSelected}from'./episode-queue.mjs';
import{CHANNELS}from'./channels.mjs';
import{scheduleSeed,scheduleEpoch,activeRotation}from'./remix.mjs';
import{validateCatalog}from'./domain.mjs';
const ids=new Set(CHANNELS.map(c=>c.id));
export function validateLineup(value){
 if(!value||value.v!==1||typeof value.title!=='string'||!value.title.trim()||value.title.length>100||!ids.has(value.channel)||!['random','ordered'].includes(value.rotation)||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff||!Number.isFinite(value.epoch)||value.epoch<0||typeof value.bumpers!=='boolean'||![1,2,3].includes(value.storiesPerTurn)||![1,2,3,'random'].includes(value.commercialCount))throw Error('Invalid shared lineup.');
 const shows=value.shows??null,mix=value.mixChannels??null;
 if(shows!==null&&(!Array.isArray(shows)||shows.length<1||shows.length>12||new Set(shows).size!==shows.length||shows.some(id=>typeof id!=='string'||!/^[\w.-]{1,160}$/.test(id))))throw Error('Invalid shared shows.');
 if(mix!==null&&(!Array.isArray(mix)||mix.some(id=>!ids.has(id)||id==='mixed')||new Set(mix).size!==mix.length))throw Error('Invalid shared channel selection.');
 return{v:1,title:value.title,channel:value.channel,shows,seed:value.seed,epoch:value.epoch,rotation:value.rotation,storiesPerTurn:value.storiesPerTurn,commercialCount:value.commercialCount,bumpers:value.bumpers,mixChannels:mix};
}
export function lineupDescriptor(catalog){if(episodeQueueSelected(catalog))throw Error('Exact episode-queue sharing is not available yet. Share the playing episode instead.');const s=catalog.settings,shows=s.streamShows||(s.streamShow?[s.streamShow]:null),title=s.streamShows?(s.customTitle||'Shared lineup'):s.streamShow?(catalog.shows.find(show=>show.id===s.streamShow)?.title||'Shared show'):CHANNELS.find(c=>c.id===s.channel).name;return validateLineup({v:1,title,channel:s.channel,shows,seed:scheduleSeed(catalog),epoch:scheduleEpoch(catalog),rotation:activeRotation(catalog),storiesPerTurn:s.storiesPerTurn??1,commercialCount:s.commercialCount??1,bumpers:s.bumpers,mixChannels:s.mixChannels??null});}
export function createLineupLink(catalog,base='https://doctorew.com/tv/'){const url=new URL(base);if(!['http:','https:'].includes(url.protocol))throw Error('Invalid sharing URL.');url.hash=new URLSearchParams({lineup:JSON.stringify(lineupDescriptor(catalog))}).toString();return url.href;}
export function parseLineupLink(value){try{const u=new URL(value),params=new URLSearchParams(u.hash.slice(1));if(u.hash.length>6000||[...params.keys()].length!==1||params.getAll('lineup').length!==1)return null;return validateLineup(JSON.parse(params.get('lineup')));}catch{return null;}}
export function applySharedLineup(catalog,descriptor){const d=validateLineup(descriptor);if(d.shows?.some(id=>!catalog.shows.some(s=>s.id===id)))throw Error('Some shows in this lineup are not in this catalog. Refresh the library first.');
 const settings={...catalog.settings,customMode:'shows',customQueueActive:false,channel:d.channel,streamShow:null,streamShows:null,rotation:d.rotation,storiesPerTurn:d.storiesPerTurn,commercialCount:d.commercialCount,bumpers:d.bumpers,...(d.mixChannels?{mixChannels:d.mixChannels}:{}),channelRemixes:{...catalog.settings.channelRemixes,[d.channel]:{seed:d.seed,epoch:d.epoch}}};
 if(d.shows)Object.assign(settings,{channel:'mixed',streamShows:d.shows,customShows:d.shows,customTitle:d.title,customSeed:d.seed,customEpoch:d.epoch,customRotation:d.rotation});return validateCatalog({...catalog,settings});
}

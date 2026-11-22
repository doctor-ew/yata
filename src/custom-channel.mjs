import{savedLineups,MAX_SAVED_LINEUPS}from'./saved-lineups.mjs';
import{hasEpisodeQueue,episodeQueueSelected}from'./episode-queue.mjs';
export const CUSTOM_CHANNEL={id:'custom',number:'00',name:'Your Channel',subtitle:'Your AI-created lineup',accent:'#d9b478'};
export function customShows(catalog){return hasEpisodeQueue(catalog)?[...new Set(catalog.settings.customQueue.map(item=>item.showId))]:catalog.settings.customShows||catalog.settings.streamShows||null;}
export function isCustomChannel(catalog){return episodeQueueSelected(catalog)||!!catalog.settings.streamShows?.length;}
export function createCustomChannel(catalog,showIds,title='Your Channel',{seed=crypto.getRandomValues(new Uint32Array(1))[0],now=Date.now()/1000}={}){
 const items=savedLineups(catalog);if(items.length>=MAX_SAVED_LINEUPS)throw Error('Save up to 50 personal lineups. Remove one before adding another.');
 const lineup={id:crypto.randomUUID(),title,showIds:[...showIds],seed,epoch:now,rotation:'random'};
 return {...catalog,settings:{...catalog.settings,savedLineups:[...items,lineup],activeLineupId:lineup.id,channel:'mixed',streamShow:null,streamShows:[...showIds],customShows:[...showIds],customTitle:title,customSeed:seed,customEpoch:now,customRotation:'random',customMode:'shows',customQueueActive:false}};
}
export function tuneCustomChannel(catalog){if(hasEpisodeQueue(catalog))return{...catalog,settings:{...catalog.settings,channel:'mixed',streamShow:null,streamShows:null,customQueueActive:true}};const shows=customShows(catalog);if(!shows?.length)throw Error('Create your channel first.');return {...catalog,settings:{...catalog.settings,channel:'mixed',streamShow:null,streamShows:[...shows]}};}
export function customGuideCatalog(catalog){return tuneCustomChannel(catalog);}

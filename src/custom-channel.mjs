export const CUSTOM_CHANNEL={id:'custom',number:'00',name:'Your Channel',subtitle:'Your AI-created lineup',accent:'#d9b478'};
export function customShows(catalog){return catalog.settings.customShows||catalog.settings.streamShows||null;}
export function isCustomChannel(catalog){return !!catalog.settings.streamShows?.length;}
export function createCustomChannel(catalog,showIds,title='Your Channel',{seed=crypto.getRandomValues(new Uint32Array(1))[0],now=Date.now()/1000}={}){
 return {...catalog,settings:{...catalog.settings,channel:'mixed',streamShow:null,streamShows:[...showIds],customShows:[...showIds],customTitle:title,customSeed:seed,customEpoch:now,customRotation:'random'}};
}
export function tuneCustomChannel(catalog){const shows=customShows(catalog);if(!shows?.length)throw Error('Create your channel first.');return {...catalog,settings:{...catalog.settings,channel:'mixed',streamShow:null,streamShows:[...shows]}};}
export function customGuideCatalog(catalog){return tuneCustomChannel(catalog);}

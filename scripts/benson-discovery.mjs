// Reviewed Benson collection: one checked media file per numbered episode.
import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const itemId='benson-complete-series-1979-1986';
const metadataUrl=`https://archive.org/metadata/${itemId}`;
const response=await fetch(metadataUrl,{signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error(`Metadata check failed: ${response.status}`);
const metadata=await response.json();
const numbered=new Map();
for(const episode of archiveEpisodes(itemId,metadata)){
 if(!episode.season||episode.durationSeconds<1100||episode.durationSeconds>2000)continue;
 const key=`${episode.season}:${episode.number}`;
 const previous=numbered.get(key);
 // Prefer the named original over duplicate generated .ia encodes.
 if(!previous||(/\.ia\.mp4$/i.test(previous.sources[0].url)&&!/\.ia\.mp4$/i.test(episode.sources[0].url)))numbered.set(key,episode);
}
const episodes=[...numbered.values()].sort((a,b)=>a.season-b.season||a.number-b.number);
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{
 while(cursor<episodes.length){
  const episode=episodes[cursor++];
  const r=await fetch(episode.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});
  const ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');
  await r.body?.cancel();
  if(!ok)throw Error(`Source check failed (${r.status}): S${episode.season}E${episode.number}`);
  episode.sources[0].availability='verified';
  episode.title=episode.title.split('/').pop().replace(/\.ia$/i,'');
 }
}));
if(!episodes.length)throw Error('No checked numbered Benson episodes; existing pack unchanged.');
const pack={checkedAt:new Date().toISOString(),provider:'archive',notes:['Reviewed numbered Benson episode files from one Archive collection. Duplicate encodes collapse by explicit season and episode.','Every selected source returned a successful small HTTP video range. This does not establish full decoding, spoken language, rights status, or complete-series availability.'],shows:[{showId:'benson',title:'Benson',channel:'comedy',items:[{itemId,title:metadata.metadata.title,metadataUrl,episodes:episodes.length}],episodes}]};
await writeFile(new URL('../data/benson-discovery.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({show:'Benson',episodes:episodes.length,seasons:[...new Set(episodes.map(e=>e.season))]}));

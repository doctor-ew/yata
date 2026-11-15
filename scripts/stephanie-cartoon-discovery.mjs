// Original-era Saturday Morning additions; keep source bundles intact.
import {readFile,writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const selections=[
 ['jem','Jem and the Holograms','Jem_and_the_Holograms',1000,1800],
 ['she-ra','She-Ra: Princess of Power (1985)','she-ra-princess-of-power_202506',1000,1800],
 ['rainbow-brite','Rainbow Brite (1984)','rainbow-brite-episode-9-star-sprinkled',1000,2000],
 ['care-bears','Care Bears (1980s)','TCBClassic19851988',500,1800],
 ['strawberry-shortcake','Strawberry Shortcake (1980s)','strawberry-shortcake-1980s-episodes-archive',500,2000],
 ['my-little-pony','My Little Pony ’n Friends (1986)','my-little-pony-n-friends-02x-14-escape-from-catrina-1',500,1800],
 ['grimm-fairy-tale-classics','Grimm’s Fairy Tale Classics','fisher-price-snow-white-and-rose-red',2000,3000],
 ['shirt-tales','Shirt Tales (1982)','shirt-tales_202607',1000,1800],
 ['heathcliff','Heathcliff and the Catillac Cats (1984)','heathcliff-and-the-catillac-cats-1984-complete-series',500,1800],
 ['garfield-friends','Garfield and Friends (1988)','garfield-and-friends.-the-complete-first-season',1000,1800],
];
const shows=[];
for(const [showId,title,itemId,min,max] of selections){
 const response=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`Metadata failed: ${itemId}`);
 const metadata=await response.json(),seen=new Set(),episodes=[];
 for(const e of archiveEpisodes(itemId,metadata)){
  if(e.durationSeconds<min||e.durationSeconds>max)continue;
  const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');
  if(seen.has(file))continue;seen.add(file);
  e.title=file.replace(/\.mp4$/i,'');
  const order=file.match(/(?:S(\d+)\s*E(\d+)|(\d+)x(\d+))/i);
  e.season=order?Number(order[1]||order[3]):0;e.number=order?Number(order[2]||order[4]):episodes.length+1;
  if(showId==='grimm-fairy-tale-classics')e.title='Snow White & Rose Red / Briar Rose · Fisher-Price VHS with Andy Crane';
  episodes.push(e);
 }
 shows.push({showId,title,channel:'cartoons',items:[{itemId,metadataUrl:`https://archive.org/metadata/${itemId}`,title:metadata.metadata.title,language:metadata.metadata.language||null}],notes:'Original-era collection. Unknown numbering uses season zero and collection order. Bundled programs, segments, and tape introductions remain intact; counts are source programs rather than a completeness claim.',episodes});
}
const excluded=[];let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e})));
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const {s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}else e.sources[0].availability='verified';}}));
shows.push({showId:'grape-ape',title:'The Great Grape Ape Show',channel:'cartoons',notes:'Wishlist: the bounded search found a Portuguese collection, promos, and multi-show recordings; no isolated English program verified. Do not schedule a trailer or a foreign dub as an English episode.',episodes:[]});
const pack={checkedAt:new Date().toISOString(),provider:'archive',notes:['Small HTTP video-range checks establish endpoint availability, not full playback, language, rights status, or series completeness. Reboots, films, promos, and download-instruction clips excluded.'],excluded,shows};
await writeFile(new URL('../data/stephanie-cartoons-discovery.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,programs:s.episodes.length})),excluded:excluded.length}));

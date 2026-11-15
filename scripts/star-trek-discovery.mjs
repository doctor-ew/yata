import{writeFile}from'node:fs/promises';import{archiveEpisodes}from'../src/domain.mjs';
const picks=[
 ['star-trek-tos','Star Trek: The Original Series','scifi',['star-trek-tos-complete'],2400,6000],
 ['star-trek-tng','Star Trek: The Next Generation','scifi',['star.-trek.-tng.-s-01-e-01-e-02-encounter-at-farpoint_202609'],2400,6000],
 ['star-trek-ds9','Star Trek: Deep Space Nine','scifi',['star-trek-deep-space-nine-emissary-extended-cut','ds-9-s-04-e-06-rejoined-1080p-x-265-10bit-joy'],2400,6000],
 ['star-trek-voyager','Star Trek: Voyager','scifi',['star-trek-voyager-complete'],2400,6000],
 ['star-trek-enterprise','Star Trek: Enterprise','scifi',['star-trek-enterprise-complete'],2400,6000],
 ['star-trek-tas','Star Trek: The Animated Series (1973)','cartoons',['star-trek-tas-s-01-e-05'],1100,1800],
];
const shows=[];
for(const[showId,title,channel,items,min,max]of picks){const episodes=[],sources=[],seen=new Set();
 for(const itemId of items){const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Metadata failed: '+itemId);const m=await r.json();sources.push({itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`});
  for(const e of archiveEpisodes(itemId,m)){
   if(e.durationSeconds<min||e.durationSeconds>max)continue;
   const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');const order=file.match(/s(\d+)\s*e(\d+)|(\d+)x(\d+)/i);if(!order)continue;
   const season=Number(order[1]||order[3]),number=Number(order[2]||order[4]),key=`${season}:${number}`;if(seen.has(key))continue;seen.add(key);
   e.title=file.replace(/\.mp4$/i,'');if(itemId==='star-trek-deep-space-nine-emissary-extended-cut')e.title+=' · extended-cut source';e.season=season;e.number=number;episodes.push(e);
  }
 }
 shows.push({showId,title,channel,items:sources,notes:showId==='star-trek-ds9'?'Partial coverage only: Emissary (source labeled extended cut) and Rejoined. No full-series claim.':showId==='star-trek-tas'?'Original animated series, first-season source collection; kept in Saturday Morning, not a new channel.':'Original series source collection. Combined double-length programs stay intact; counts are playable source programs, not split broadcast episode totals. Movie/reaction/promo collections excluded.',episodes});
}
let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
await writeFile(new URL('../data/star-trek-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['Small HTTP range checks establish endpoint availability, not full decoding, spoken language, completeness or rights. Five live-action series join Sci-Fi; the animated series joins Saturday Morning.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,programs:s.episodes.length})),excluded:excluded.length}));

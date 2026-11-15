import{writeFile}from'node:fs/promises';import{archiveEpisodes}from'../src/domain.mjs';
const picks=[['quantum-leap','Quantum Leap (1989)','scifi',['QLSeason1','QLSeason2','qlseason-3','QLSeason4','QLSeason5']],['flash-1990','The Flash (1990)','action',['the-flash-1990-complete-tv-series-thegoodone']],['greatest-american-heroine','The Greatest American Heroine · pilot','action',['the-greatest-american-heroine-pilot']]];
const shows=[];
for(const[showId,title,channel,items]of picks){const episodes=[],sources=[];
 for(const[itemIndex,itemId]of items.entries()){const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Metadata failed');const m=await r.json(),seen=new Set();sources.push({itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`});
  for(const e of archiveEpisodes(itemId,m)){
   if(e.durationSeconds<2400||e.durationSeconds>6000)continue;
   const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');if(seen.has(file.toLowerCase()))continue;seen.add(file.toLowerCase());
   e.title=file.replace(/\.mp4$/i,'');const order=file.match(/s(\d+)e(\d+)/i);
   if(showId==='quantum-leap'){const n=file.match(/Episode\s+(\d+)/i);if(!n)continue;e.season=0;e.number=episodes.length+1;e.title=`Quantum Leap · season ${itemIndex+1}, source program ${Number(n[1])}`;}
   else{e.season=order?Number(order[1]):0;e.number=order?Number(order[2]):1;}
   episodes.push(e);
  }
 }
 shows.push({showId,title,channel,items:sources,notes:showId==='quantum-leap'?'Original Scott Bakula series. Source program order is retained; the feature-length opening program stays intact. Program counts differ from split broadcast episode counts.':showId==='greatest-american-heroine'?'One unaired spin-off pilot, not a multi-episode series.':'John Wesley Shipp 1990 series. Feature-length opening pilot stays intact; no 2014 reboot entries.',episodes});
}
let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
await writeFile(new URL('../data/time-travel-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['HTTP range checks establish endpoint availability, not full decoding, language, completeness or rights.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify(shows.map(s=>({id:s.showId,programs:s.episodes.length}))));

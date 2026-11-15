// Reviewed original late-night animation. Never substitute clips for full TV programs.
import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const selections=[
 ['cartoon-planet','Cartoon Planet (1995)','cartoon-planet-1995',1000,1800],
 ['space-ghost-c2c','Space Ghost Coast to Coast','sgc2c-gametap-episodes',120,600],
 ['athf','Aqua Teen Hunger Force (2000)','aqua-teen-hunger-force-2000-s-01e-01-rabbot',500,1000],
 ['beavis-butthead','Beavis and Butt-Head (1990s)','beavis-butt-head-1992-97',120,1800],
 ['the-maxx','The Maxx (1995)','s-01-e-11-episode-11',500,1400],
 ['the-tick','The Tick (1994 animated)','the-tick-1994-animated-complete',1000,1800],
];
const shows=[];
for(const [showId,title,itemId,min,max]of selections){
 const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Metadata failed: ${itemId}`);const m=await r.json(),seen=new Set(),episodes=[];
 for(const e of archiveEpisodes(itemId,m)){
  if(e.durationSeconds<min||e.durationSeconds>max)continue;
  const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');
  const order=file.match(/s(\d+)\s*e(\d+)/i);
  if(showId==='athf'&&(!order||Number(order[1])<1||Number(order[1])>5))continue;
  if(seen.has(file.toLowerCase()))continue;seen.add(file.toLowerCase());
  e.title=file.replace(/\.mp4$/i,'');e.season=order?Number(order[1]):0;e.number=order?Number(order[2]):Number(file.match(/(?:episode|planet)\D*(\d+)/i)?.[1]||episodes.length+1);
  if(showId==='space-ghost-c2c')e.title+=' · GameTap (2006–2008)';
  episodes.push(e);
 }
 shows.push({showId,title,channel:'late-night',items:[{itemId,metadataUrl:`https://archive.org/metadata/${itemId}`,title:m.metadata.title,language:m.metadata.language||null}],notes:showId==='space-ghost-c2c'?'Fourteen short-form GameTap interviews (2006–2008), not the original 1994 cable episode run.':showId==='athf'?'Original seasons 1–5 only. Later seasons and Aquadonk shorts excluded.':'Original-era source programs. Collection order retained when source numbering is unknown. Films, promos, and reboots excluded by reviewed collection and duration.',episodes});
}
let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
for(const[showId,title,episode,url]of[
 ['squidbillies','Squidbillies','This Show Is Called Squidbillies','https://www.adultswim.com/videos/squidbillies/this-show-is-called-squidbillies'],
 ['robot-chicken','Robot Chicken','Junk in the Trunk','https://www.adultswim.com/videos/robot-chicken/junk-in-the-trunk'],
]){
 const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Official page failed: ${r.status}`);await r.body?.cancel();shows.push({showId,title,channel:'late-night',notes:'Official external episode page only. Not an embedded source; excluded from live rotation. Playback may depend on location or provider access.',episodes:[{id:showId+'-official',title:episode+' · watch on Adult Swim',season:1,number:1,durationSeconds:null,group:'',kind:'episode',sources:[{id:showId+'-official-source',provider:'adultswim',url,availability:'verified'}]}]});
}
await writeFile(new URL('../data/late-night-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive and official Adult Swim pages',notes:['Small HTTP video-range checks establish endpoint availability, not full playback, language, rights status, or series completeness. Official external pages are not scheduled.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,items:s.episodes.length})),excluded:excluded.length}));

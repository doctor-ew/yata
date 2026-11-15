import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
// New show identifiers represent the three approved Saturday Morning additions.
const valleyItems=["what-goes-up_1974", "episode-16-torch", "episode-9-top-cave-please", "episode-13-to-fly-a-kite", "valley-of-the-dinosaurs-episode-3-a-turned-turtle", "valley-of-the-dinosaurs-episode-4-the-volcano", "valley-of-the-dinosaurs-episode-5-smoke-screen", "valley-of-the-dinosaurs-episode-6-pteranodon", "episode-14-test-flight", "forbidden-fruit1974", "episode-11-fire", "episode-7-the-saber-tooth-kids", "episode-12-rain-of-meteors-november-1974", "episode-8-after-shock", "episode-15-the-big-toothache"];
const picks=[
 ['flash-gordon-1979','The New Adventures of Flash Gordon (1979)',['the_new_adventures_of_flash_gordon']],
 ['return-planet-apes','Return to the Planet of the Apes (1975)',['return-to-the-planet-of-the-apes-e-10-attack-from-the-clou']],
 ['valley-dinosaurs','Valley of the Dinosaurs (1974)',valleyItems],
];
const shows=[];
for(const [showId,title,itemIds]of picks){const episodes=[],items=[],seen=new Set();for(const itemId of itemIds){
 const response=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Metadata failed: '+itemId);const m=await response.json();items.push({itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`});
 for(const e of archiveEpisodes(itemId,m)){
  if(e.durationSeconds<1100||e.durationSeconds>1700)continue;
  const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');let season=1,number;
  if(showId==='flash-gordon-1979'){const order=file.match(/S(\d+)E(\d+)/i);if(!order)continue;season=Number(order[1]);number=Number(order[2]);}
  else if(showId==='return-planet-apes'){const order=file.match(/\bE(\d+)\b/i);if(!order)continue;number=Number(order[1]);}
  else{const order=String(m.metadata.title).match(/(?:Ep\.?|Episode)\s*(\d+)/i);if(!order)continue;number=Number(order[1]);}
  const key=`${season}:${number}`;if(seen.has(key))continue;seen.add(key);e.season=season;e.number=number;
  e.title=showId==='valley-dinosaurs'?String(m.metadata.title):file.replace(/\.mp4$/i,'').replace(/\.DVDRip.*$/i,'').replace(/\.1979\./,'.').replace(/\./g,' ');episodes.push(e);
 }
 }episodes.sort((a,b)=>a.season-b.season||a.number-b.number);shows.push({showId,title,channel:'cartoons',items,notes:showId==='flash-gordon-1979'?'24 half-hour programs across two seasons; second-season paired shorts stay intact. Feature-length film and extras excluded.':showId==='return-planet-apes'?'13 episodes. Episodes 6 and 9 are labeled 480p in the source; other filenames labeled HD. Duplicate .ia derivatives excluded.':'Partial coverage: 15 episodes; episode 10 not found in this search. End-credit-only clips excluded.',episodes});}
let cursor=0;const excluded=[],all=shows.flatMap(s=>s.episodes.map(e=>({s,e})));await Promise.all(Array.from({length:6},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
await writeFile(new URL('../data/saturday-adventure-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['Original animated series join Saturday Morning and the main mixed stream. HTTP range checks establish endpoint availability, not full-file decoding.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,programs:s.episodes.length})),excluded:excluded.length}));

import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
// New collection identifiers group the requested additions without creating channels.
const picks = [
 ['star-wars-droids','Star Wars: Droids (1985)','cartoons','star-wars-droids_202602',1100,3100],
 ['star-wars-holiday-special','The Star Wars Holiday Special (1978)','scifi','the-star-wars-holiday-special',5700,6100],
 ['sealab-2020','Sealab 2020 (1972)','cartoons','s.-2020.-s-01-e-11.-collision.of.the.-aquarius.-dvdrip.x-264-ti-megod-2',1200,1500],
 ['venture-bros','The Venture Bros.','late-night','venture.bros.s01.s02.1080p.upscale',600,1600],
];
const shows=[];
for(const [showId,title,channel,itemId,min,max] of picks){
 const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Metadata failed: '+itemId);const m=await r.json(),episodes=[],seen=new Set();
 for(const e of archiveEpisodes(itemId,m)){
  if(e.durationSeconds<min||e.durationSeconds>max)continue;
  const path=decodeURIComponent(new URL(e.sources[0].url).pathname),file=path.split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');
  const order=file.match(/S(\d+)\s*E(\d+)/i);
  if(showId==='venture-bros'&&(!order||(/\/Extras\//i.test(path))||(Number(order[1])===0&&![1,2].includes(Number(order[2])))))continue;
  if(showId!=='star-wars-holiday-special'&&!order)continue;
  e.season=order?Number(order[1]):0;e.number=order?Number(order[2]):1;
  if(showId==='star-wars-droids'&&/The Great Heep/i.test(file)){e.season=0;e.number=1;e.title='The Great Heep · special';}
  else if(showId==='star-wars-holiday-special')e.title='The Star Wars Holiday Special (1978)';
  else e.title=file.replace(/\.mp4$/i,'').replace(/\.1080p.*$|\.DVDRip.*$/i,'').replace(/\./g,' ');
  const key=`${e.season}:${e.number}`;if(seen.has(key))continue;seen.add(key);episodes.push(e);
 }
 const notes=showId==='venture-bros'?'Seasons 1–2 plus the pilot and Christmas special only. DVD extras and production featurettes excluded; source is labeled an upscale.':showId==='star-wars-droids'?'13 regular episodes plus The Great Heep special, classified separately as season zero.':showId==='sealab-2020'?'13 source episodes of the original adventure series. Sealab 2021 remains a separate Late Night Toons show.':'1978 television special, approximately 97 minutes; not the later LEGO special.';
 shows.push({showId,title,channel,items:[{itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`}],notes,episodes});
}
const excluded=[];let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e})));
await Promise.all(Array.from({length:6},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
await writeFile(new URL('../data/retro-requests-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['Small range checks establish endpoint availability; sample decoding is separate. No full videos are copied or rehosted.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,programs:s.episodes.length})),excluded:excluded.length}));

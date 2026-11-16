// Reviewed original-series collections. Only metadata and small HTTP ranges are fetched.
import {readFile,writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
import {VINTAGE_ADDITIONS} from '../src/vintage-additions.mjs';
const cache=process.argv[2];
if(!cache)throw Error('Provide a directory containing reviewed Archive metadata JSON.');
const picks={
 'kojak':['Kojak-Lando18'],
 'starsky-hutch':['sty-ch-s-01-e-00-lot','starsky-hutch-season-2','starsky-hutch-s-03e-03-fatal-charm'],
 'emergency':['cy-s-0-e-0-te-we-t7'],
 'mr-magoo':['title_t02_202601'],
 'smurfs':['the-smurfs-1981_202601'],
 'dallas':['Dallas-s2-1080p','Dallas-s3-1080p'],
 'room-222':['Room-222-Season-1','Room-222-Season-2','room-222-1969-season-3'],
 'fractured-fairy-tales':['z-fractured-fairy-tales-4-hour-marathon'],
 'dudley-do-right':['dudley-do-right-complete-720-540'],
 'rocky-bullwinkle':['show-1_20260614'],
 'woody-woodpecker':['028-the-mad-hatter-1948'],
 'chilly-willy':['walter-lantzs-chilly-willy'],
 'dastardly-muttley':['dastardly-and-muttley-1985-uk-vhs'],
 'mighty-hercules':['the-mighty-hercules-daedalus-becomes-a-giant-remastered'],
};
const notes={kojak:'Original Telly Savalas series. Foreign-language copies, later revival films, commentary collections and a broadcast missing its ending were excluded.', 'dastardly-muttley':'Intact original-series UK VHS compilation, not an individually numbered episode. A dual-audio collection was excluded pending audio-track review.', 'mr-magoo':'Original-series DVD transfers retain source file labels; episode order is unknown.', 'room-222':'Only the first three season collections were used. Later collections have suspect repeated duration metadata and remain excluded.',dallas:'Original 1978 series, seasons two and three only; this is not a complete-series claim.'};
const shows=[];
for(const show of VINTAGE_ADDITIONS.filter(s=>!process.argv[3]||process.argv[3].split(',').includes(s.id))){
 const episodes=[],items=[],seen=new Set();
 for(const itemId of picks[show.id]){
  const metadata=JSON.parse(await readFile(`${cache}/${itemId}.json`,'utf8'));
  items.push({itemId,title:metadata.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`});
  for(const e of archiveEpisodes(itemId,metadata)){
   if(!e.durationSeconds||e.durationSeconds<180||e.durationSeconds>6200)continue;
   const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').at(-1).replace(/\.ia(?=\.mp4$)/i,'');
   if(show.id==='starsky-hutch'&&!/starsky|^s\d/i.test(file))continue;
   if(/bonus|trailer|theme song|credit|intro|sample/i.test(file))continue;
   const order=file.match(/S(\d+)[ ._-]*(?:E)[ ._-]*(\d+)/i);
   if(order){e.season=+order[1];e.number=+order[2];}
   const key=order?`${e.season}:${e.number}`:file.toLowerCase();
   if(seen.has(key))continue;seen.add(key);
   e.title=file.replace(/\.mp4$/i,'').replace(/\.1080p$/i,'').replace(/\./g,' ').slice(0,500);
   if(show.id==='dastardly-muttley')e.title='Dastardly and Muttley · original-series VHS compilation (1985 UK release)';
   episodes.push(e);
  }
 }
 episodes.sort((a,b)=>a.season-b.season||a.number-b.number);
 shows.push({showId:show.id,title:show.title,channel:show.channel,items,notes:notes[show.id]||'Original-era source programs; source order retained when explicit. Counts do not establish series completeness.',episodes,sourceChecks:[]});
}
let cursor=0;const entries=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<entries.length){const {s,e}=entries[cursor++];let status=null,contentType=null,ok=false;for(let i=0;i<2&&!ok;i++)try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(18000)});status=r.status;contentType=r.headers.get('content-type');ok=[200,206].includes(status)&&/video\/|octet-stream/i.test(contentType||'');await r.body?.cancel();}catch{}
 s.sourceChecks.push({url:e.sources[0].url,method:'GET bytes=0-1023',status,contentType,verified:ok});if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url,status});}
 if(cursor%100===0)console.log(`${cursor}/${entries.length} endpoints checked`);
}}));
const result={checkedAt:new Date().toISOString(),provider:'archive',notes:['Metadata and small byte-range responses establish endpoint availability, not complete decoding or distribution rights. All media remains on its original provider.'],excluded,shows};
if(process.argv[3]){const previous=JSON.parse(await readFile(new URL('../data/vintage-additions-discovery.json',import.meta.url),'utf8'));result.shows=[...previous.shows.filter(s=>!shows.some(n=>n.showId===s.showId)),...shows];result.excluded=[...previous.excluded.filter(e=>!shows.some(s=>s.showId===e.showId)),...excluded];}
await writeFile(new URL('../data/vintage-additions-discovery.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,episodes:s.episodes.length})),excluded:excluded.length}));

// Curate reviewed original-era recordings without replacing the authoritative catalog.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {archiveEpisodes,validateCatalog} from '../src/domain.mjs';
const [metadataDir,baseFile,outFile]=process.argv.slice(2);if(!outFile)throw Error('Provide metadata directory, authoritative base snapshot, and candidate output.');
const read=name=>readFile(`${metadataDir}/${name}.json`,'utf8').then(JSON.parse);
const family=await read('family-items');
const selections=[
 {id:'kids-in-the-hall',title:'The Kids in the Hall (1988)',items:[],tvmazeId:5112},
 {id:'mr-belvedere',title:'Mr. Belvedere',items:['mr.-belvedere-s-04e-20-the-counselor-1'],tvmazeId:7603},
 {id:'227',title:'227 (1985)',items:['227-complete_TV_Series_CTV'],tvmazeId:7602},
 {id:'family-matters',title:'Family Matters',items:family,tvmazeId:1250},
 {id:'a-different-world',title:'A Different World (1987)',items:['a-different-world-6.17-18','ADifferentWorldAllSFairSeason2Episode9','a-different-world-season-6-episode-25-college-kid'],tvmazeId:7704},
];
const notes=['Original-era selections only. Excludes a mislabeled 2022 Kids in the Hall recording and the 2026 A Different World reboot.','One encoding per recording; episode and language labels remain subject to source accuracy. Range checks do not establish full decoding, rights or continued availability.','The 227 collection is incomplete despite its uploader title. A Different World 6.17-18 stays one combined recording without fabricated split points.'];
const shows=[];const sourceChecks=[];const records=[];
for(const s of selections){
 const episodes=[];const seen=new Set();
 for(const item of s.items){
  const data=await read(item);let found;try{found=archiveEpisodes(item,data);}catch{continue;}
  records.push({item,title:data.metadata?.title,url:`https://archive.org/details/${item}`});
  for(const e of found){
   if(!e.durationSeconds||e.durationSeconds<1100||e.durationSeconds>3000)continue;
   const filename=decodeURIComponent(new URL(e.sources[0].url).pathname.split('/').pop());
   // Archive may expose .ia2 alternatives without an original relationship.
   const order=filename.match(/\bs[ ._-]*(\d+)[ ._-]*e[ ._-]*(\d+)/i)||filename.match(/Season[ _-]*(\d+).*Episode[ _-]*(\d+)/i);
   const combined=s.id==='a-different-world'&&item==='a-different-world-6.17-18';
   e.season=order&&!combined?+order[1]:0;e.number=order&&!combined?+order[2]:0;
   const key=order?`${e.season}-${e.number}`:item;
   if(s.id==='family-matters'&&!order)continue;
   if(seen.has(key))continue;seen.add(key);
   const hash=createHash('sha256').update(e.sources[0].url).digest('hex').slice(0,20);
   e.id=`${s.id}-${hash}`;e.sources[0].id=`archive-${hash}`;
   e.title=combined?'A Different World — uploader-labelled 6.17–18 · combined recording':filename.replace(/(?:\.ia\d*)?\.mp4$/i,'').replace(/_/g,' ');
   episodes.push(e);
  }
 }
 if(s.id==='kids-in-the-hall'){
  const data=await read('kids-youtube');
  for(const x of data.entries){
   if(x.channel!=='FilmRise Television'||x.playable_in_embed!==true||x.is_live===true||x.duration<1000||x.duration>1900)throw Error('Reviewed YouTube source changed.');
   const m=x.title.match(/Season (\d+) Episode (\d+)/i);if(!m)throw Error('Missing source order.');
   episodes.push({id:`kids-youtube-${x.id}`,title:x.title,season:+m[1],number:+m[2],durationSeconds:x.duration,group:'',kind:'episode',sources:[{id:`youtube-${x.id}`,provider:'youtube',url:`https://www.youtube.com/watch?v=${x.id}`,availability:'verified'}]});
   sourceChecks.push({url:`https://www.youtube.com/watch?v=${x.id}`,verified:true,method:'yt-dlp public metadata',channel:x.channel,embeddable:x.playable_in_embed,durationSeconds:x.duration});
  }
 }
 episodes.sort((a,b)=>a.season-b.season||a.number-b.number||a.title.localeCompare(b.title));
 shows.push({id:s.id,title:s.title,channel:'comedy',imdbUrl:null,episodes});
}
const queue=shows.flatMap(s=>s.episodes).filter(e=>e.sources[0].provider==='archive');let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<queue.length){const e=queue[cursor++];const url=e.sources[0].url;try{const r=await fetch(url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(35000)});const type=r.headers.get('content-type');const verified=[200,206].includes(r.status)&&/video\/|octet-stream/.test(type||'');await r.body?.cancel();sourceChecks.push({url,status:r.status,contentType:type,verified,method:'GET bytes=0-1023'});e.sources[0].availability=verified?'verified':'unverified';}catch{e.sources[0].availability='unverified';sourceChecks.push({url,verified:false,method:'GET bytes=0-1023'});}}}));
for(const s of shows)s.episodes=s.episodes.filter(e=>e.sources[0].availability==='verified');
if(shows.some(s=>!s.episodes.length))throw Error('A requested show has no verified source.');
const base=JSON.parse(await readFile(baseFile,'utf8'));if(shows.some(s=>base.shows.some(b=>b.id===s.id)))throw Error('Existing show requires merge review.');
const catalog=validateCatalog({...base,shows:[...base.shows,...shows]});
await writeFile(outFile,JSON.stringify(catalog)+'\n');
await writeFile(new URL('../data/family-comedy-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),notes,selections,records,shows,sourceChecks},null,2)+'\n');
console.log(JSON.stringify(shows.map(s=>({title:s.title,episodes:s.episodes.length})),null,2));

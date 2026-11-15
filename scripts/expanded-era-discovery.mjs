import {readFile,writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const args=process.argv.slice(2);
const completeSpecs=JSON.parse(await readFile(new URL('../data/expanded-era-sources.json',import.meta.url),'utf8'));
const only=args.includes('--only')?new Set(args[args.indexOf('--only')+1].split(',')):null;
const specs=completeSpecs.filter(s=>!only||only.has(s.id));
const cache=args.includes('--metadata-dir')?args[args.indexOf('--metadata-dir')+1]:null;
const metadata=async id=>{if(cache){try{return JSON.parse(await readFile(new URL(`${id}.json`,new URL(`file://${cache.replace(/\/$/,'')}/`)),'utf8'));}catch{}}const r=await fetch(`https://archive.org/metadata/${id}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`Metadata ${r.status}: ${id}`);return r.json();};
const shows=[],rejected=[];let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<specs.length){const spec=specs[cursor++],episodes=[],items=[],seen=new Set();let sequence=0;
 for(const itemId of spec.items){const m=await metadata(itemId);items.push({itemId,title:m.metadata?.title,metadataUrl:`https://archive.org/metadata/${itemId}`});let rows;try{rows=archiveEpisodes(itemId,{...m,files:m.files.filter(f=>/\.mp4$/i.test(f.name)).map(({original,...f})=>f)});}catch(e){rejected.push({showId:spec.id,itemId,reason:e.message});continue;}
 rows.sort((a,b)=>a.sources[0].url.localeCompare(b.sources[0].url,undefined,{numeric:true}));
 for(const e of rows){const path=decodeURIComponent(new URL(e.sources[0].url).pathname),file=path.split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');if(e.durationSeconds<spec.min||e.durationSeconds>spec.max)continue;
 if(/(?:\/Extras\/|Special Features|Alternate|Alt Version|Unaired|Deleted|Commentary|Making.of|Interview|Beforel|DVD.Menu)/i.test(path))continue;
 let season=0,number=0;const order=file.match(/S(\d+)[ ._-]*E(?:pisode)?[ ._-]*(\d+)(?!\d)|(\d+)\s*x\s*(\d+)(?!\d)/i);
 if(spec.mode==='collection'||spec.mode==='bundle'){number=++sequence;}
 else if(spec.mode==='babylon'){if(!/^\/download\/[^/]+\/Season [1-5]\//.test(path)||/Special Features|Commentary/i.test(path))continue;const p=file.match(/^(\d+)-(\d+)_/);if(!p)continue;season=Number(p[1]);number=Number(p[2]);}
 else if(spec.mode==='star-blazers'){const p=file.match(/Star Blazers (\d+)\.(\d+) remaster/i);if(!p)continue;season=Number(p[1]);number=Number(p[2]);}
 else if(spec.mode==='highwayman'){const p=file.match(/Episode (\d+)/i);if(p){season=1;number=Number(p[1]);}else if(/Pilot Movie/i.test(file)){season=0;number=1;}else continue;}
 else if(order){season=Number(order[1]||order[3]);number=Number(order[2]||order[4]);}
 else if(spec.mode==='compact'){const p=file.match(/\b([1-3])(\d{2})\b/);if(!p)continue;season=Number(p[1]);number=Number(p[2]);}
 else if(spec.mode==='dash'||spec.mode==='small-wonder'){const p=file.match(/\b(\d+)[.-](\d+)\b/);if(!p)continue;season=Number(p[1]);number=Number(p[2]);}
 else if(spec.mode==='episode'){const p=file.match(/(?:Episode|Ep\.?|E)[ ._-]*(\d+)(?!\d)/i);if(!p)continue;number=Number(p[1]);}
 else if(spec.mode==='leading'){const p=file.match(/^(\d+)[ ._-]/);if(!p)continue;number=Number(p[1]);}
 else continue;
 if(spec.id==='max-headroom'&&!/Max Headroom [12]X/i.test(file))continue;
 if(spec.id==='red-dwarf'&&(season<1||season>8))continue;
 if(['alien-nation','battle-planets','time-tunnel'].includes(spec.id)&&(season===0||number===0))continue;
 if(spec.id==='ulysses-31'&&number===0)continue;
 const key=spec.mode==='collection'||spec.mode==='bundle'?file.replace(/\.mp4$/i,'').toLowerCase():`${season}:${number}`;if(seen.has(key))continue;seen.add(key);
 e.season=season;e.number=number;e.title=file.replace(/\.mp4$/i,'').replace(/\.DVDRip.*|\.1080p.*|\.720p.*|\.480p.*$/i,'').replace(/_/g,' ').slice(0,500);
 if(spec.mode==='bundle')e.title+=' · intact multi-episode compilation';
 if(spec.id==='remington-steele')e.title='Remington Steele · mixed off-air recording (other footage + embedded ads)';
 if(spec.id==='classic-doctor-who')e.group=`Season ${season} · ${e.title.replace(/^S\d+E\d+\s*/i,'').replace(/\s*\(\d+\)\s*$/,'')}`;
 if(spec.id==='tomorrow-people')e.group=file.replace(/Ep\d+.*$/i,'').trim();
 episodes.push(e);
 }
 }
 episodes.sort((a,b)=>a.season-b.season||a.number-b.number);shows.push({showId:spec.id,title:spec.title,channel:spec.channel,items,notes:spec.notes,episodes});console.log(spec.id+': '+episodes.length);
}}));
shows.sort((a,b)=>specs.findIndex(s=>s.id===a.showId)-specs.findIndex(s=>s.id===b.showId));
const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];cursor=0;let checked=0;
await Promise.all(Array.from({length:10},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;for(let attempt=0;attempt<2&&!ok;attempt++){try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(18000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}if(++checked%250===0)console.log('Range checked '+checked+'/'+all.length);}}));
if(only){const previous=JSON.parse(await readFile(new URL('../data/expanded-era-discovery.json',import.meta.url),'utf8'));shows.push(...previous.shows.filter(s=>!only.has(s.showId)));excluded.push(...previous.excluded.filter(s=>!only.has(s.showId)));rejected.push(...previous.rejected.filter(s=>!only.has(s.showId)));shows.sort((a,b)=>completeSpecs.findIndex(s=>s.id===a.showId)-completeSpecs.findIndex(s=>s.id===b.showId));}
await writeFile(new URL('../data/expanded-era-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['Original-era programs only. Public metadata and small HTTP range checks establish endpoint availability, not complete decoding or series completeness. Unknown broadcast order remains season zero. Collections and long pilots stay intact.'],rejected,excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.length,programs:shows.reduce((n,s)=>n+s.episodes.length,0),gaps:shows.filter(s=>!s.episodes.length).map(s=>s.showId),excluded:excluded.length}));

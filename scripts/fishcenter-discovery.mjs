// Import only the explicitly reviewed small selection; never crawl or seed on publication.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateCatalog,parseSourceUrl,MAX_IMPORT_BYTES} from '../src/domain.mjs';

export function buildFishCenterCatalog(input,selection){
 const base=validateCatalog(input);
 if(base.shows.some(s=>s.id==='fishcenter'))throw Error('FishCenter already exists; review an explicit merge.');
 if(selection?.version!==1||!Array.isArray(selection.recordings)||selection.recordings.length!==12)throw Error('Use the reviewed twelve-recording FishCenter selection.');
 const dates=new Set();
 const episodes=selection.recordings.map(record=>{
  const source=parseSourceUrl(record.url),date=record.date;
  if(source.provider!=='archive'||source.kind!=='video'||source.itemId!==record.identifier||source.file!==record.file||!/^Fish\s*center\s+Live\s*[-–:]/i.test(record.title)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||dates.has(date)||!Number.isFinite(record.durationSeconds)||record.durationSeconds<900||record.durationSeconds>14400||!record.verification?.mp4Header||![200,206].includes(record.verification.httpStatus)||record.verification.media?.videoCodec!=='h264'||record.verification.media?.audioCodec!=='aac'||Math.abs(record.verification.media.durationSeconds-record.durationSeconds)>2)throw Error('Unreviewed or duplicate FishCenter recording.');
  dates.add(date);
  const description=record.description.replace(/^Streamed live on adultswim\.com at [^.]+\.\s*(?:Site description:|Description:)?\s*/i,'').trim();
  return{id:`fishcenter-${date}`,title:`FishCenter Live — ${date}${description?' · '+description:''}`.slice(0,500),season:0,number:0,durationSeconds:record.durationSeconds,group:'',kind:'episode',sources:[{id:'archive-recording',provider:'archive',url:source.url,availability:'verified'}]};
 }).sort((a,b)=>a.id.localeCompare(b.id));
 const next=validateCatalog({...base,shows:[...base.shows,{id:'fishcenter',title:'FishCenter Live',channel:'comedy',imdbUrl:null,episodes}]});
 if(Buffer.byteLength(JSON.stringify(next))>MAX_IMPORT_BYTES)throw Error('Catalog exceeds publication size limit.');
 return next;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/fishcenter-discovery.mjs AUTHORITATIVE_BASE OUTPUT');
 const selection=JSON.parse(await readFile(new URL('../data/fishcenter-selections.json',import.meta.url),'utf8'));
 const next=buildFishCenterCatalog(JSON.parse(await readFile(input,'utf8')),selection);await writeFile(output,JSON.stringify(next)+'\n');console.log(JSON.stringify({shows:next.shows.length,fishcenterRecordings:12,channel:'comedy',registryChanged:false}));
}

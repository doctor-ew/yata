// Recheck the reviewed source URLs; do not download media or infer missing episodes.
import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../data/seventies-discovery.json',import.meta.url),pack=JSON.parse(await readFile(file,'utf8'));
const checks=[];for(const show of pack.shows){show.sourceChecks=[];for(const episode of show.episodes)for(const source of episode.sources)checks.push({show,source});}
let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<checks.length){const {show,source}=checks[cursor++];let verified=false,status=null,contentType=null;try{const r=await fetch(source.url,{method:'HEAD',signal:AbortSignal.timeout(25000)});status=r.status;contentType=r.headers.get('content-type');verified=r.ok&&/video\/|octet-stream/i.test(contentType||'');}catch{}source.availability=verified?'verified':'unverified';show.sourceChecks.push({url:source.url,checkedAt:new Date().toISOString(),method:'HEAD',verified,status,contentType});}}));
for(const show of pack.shows)show.coverage.httpVerifiedEntries=show.episodes.filter(e=>e.sources.some(s=>s.availability==='verified')).length;
pack.checkedAt=new Date().toISOString();await writeFile(file,JSON.stringify(pack,null,2)+'\n');console.log(pack.shows.map(s=>({show:s.showId,episodes:s.episodes.length,verified:s.coverage.httpVerifiedEntries})));

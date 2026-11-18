#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateCatalog,MAX_IMPORT_BYTES} from '../src/domain.mjs';
import {fetchPublishedCatalog} from '../src/published-catalog.mjs';
import {buildEpisodeEvidence} from '../src/episode-evidence.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),options={out:'/tmp/yata-episode-evidence',max:150,shows:'street-hawk,knight-rider,gargoyles'};
for(let i=0;i<args.length;i++){const key=args[i].replace(/^--/,'');if(!['out','catalog','revision','max','shows'].includes(key)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Use --out DIR [--catalog FILE --revision SHA256] [--max 1..150] [--shows ID,ID].');options[key]=args[++i];}
const maximum=Number(options.max);if(!Number.isSafeInteger(maximum)||maximum<1||maximum>150)throw Error('Pilot document limit must be 1..150.');
const selected=options.shows.split(',').filter(Boolean);if(!selected.length||selected.length>8)throw Error('Select 1..8 existing series IDs.');
const out=resolve(options.out);await mkdir(join(out,'provider-cache'),{recursive:true});
let catalog,catalogRevision;
if(options.catalog){const text=await readFile(resolve(options.catalog),'utf8');if(Buffer.byteLength(text)>MAX_IMPORT_BYTES)throw Error('Oversized catalog.');catalogRevision=createHash('sha256').update(text).digest('hex');if(!options.revision||options.revision!==catalogRevision)throw Error('Local catalog must match the explicitly supplied SHA256 revision.');catalog=validateCatalog(JSON.parse(text));}
else{const result=await fetchPublishedCatalog({manifestUrl:'https://doctorew.com/tv/data/published-catalog-v2-manifest.json',fetcher:(url,settings)=>fetch(new URL(url,'https://doctorew.com/tv/'),{...settings,signal:AbortSignal.timeout(20000)})});if(!result.available||!result.catalog)throw Error('Authoritative published catalog unavailable.');catalog=result.catalog;catalogRevision=result.revision;}
const metadata=JSON.parse(await readFile(join(root,'data/library-art.json'),'utf8')).shows;
const documents=[],coverage=[];let lastRequest=0;
async function episodeList(id){const path=join(out,'provider-cache',`${id}.json`);try{const cache=JSON.parse(await readFile(path,'utf8'));if(cache.version===1&&cache.providerShowId===id&&Array.isArray(cache.episodes)&&Date.now()-Date.parse(cache.fetchedAt)<86400000)return cache;}catch{}
 await new Promise(r=>setTimeout(r,Math.max(0,1100-(Date.now()-lastRequest))));lastRequest=Date.now();
 const response=await fetch(`https://api.tvmaze.com/shows/${id}/episodes`,{headers:{'User-Agent':'YATA episode-evidence pilot (doctorew.com)'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`TVmaze episode list failed: ${response.status}`);const episodes=await response.json();if(!Array.isArray(episodes)||episodes.length>5000)throw Error('Invalid provider episode list.');const cache={version:1,providerShowId:id,fetchedAt:new Date().toISOString(),episodes};await writeFile(path,JSON.stringify(cache,null,2)+'\n');return cache;}
for(const showId of selected){const show=catalog.shows.find(s=>s.id===showId);if(!show)throw Error(`Selected show is absent from authoritative catalog: ${showId}`);const providerShowId=metadata[showId]?.tvmazeId;if(!Number.isSafeInteger(providerShowId))throw Error(`No reviewed TVmaze show identity: ${showId}`);const provider=await episodeList(providerShowId),report={showId,showTitle:show.title,catalogItems:show.episodes.length,included:0,reasons:{}};
 for(const episode of show.episodes){const {document,reason}=buildEpisodeEvidence({show,episode,providerEpisodes:provider.episodes,providerShowId,catalogRevision,fetchedAt:provider.fetchedAt});if(document&&documents.length<maximum){documents.push(document);report.included++;}else{const key=document?'pilot-limit':reason;report.reasons[key]=(report.reasons[key]||0)+1;}}coverage.push(report);}
const generatedAt=new Date().toISOString(),corpus={version:1,catalogRevision,generatedAt,documents};
await writeFile(join(out,'evidence.json'),JSON.stringify(corpus,null,2)+'\n');
const evaluation={version:1,catalogRevision,generatedAt,scope:'TVmaze full-episode summaries for matched checked standalone items; no transcripts, scene timestamps, cast extraction or measured retrieval quality.',coverage,candidates:documents.slice(0,20).map(document=>({query:`${document.showTitle} ${document.match.providerEpisodeTitle}`,expectedShowId:document.showId,expectedEpisodeId:document.episodeId,evidenceId:document.evidenceId,kind:'title-lookup',reviewRequired:true})),negativeCandidates:[{query:'What exact line is spoken at 12 minutes?',expected:'unsupported-no-transcript'},{query:'Recap only what happened before my current playhead.',expected:'unsupported-untimed-summary'}]};
await writeFile(join(out,'evaluation.json'),JSON.stringify(evaluation,null,2)+'\n');
console.log(JSON.stringify({catalogRevision,documents:documents.length,coverage,output:out},null,2));

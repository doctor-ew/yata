import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const run=promisify(execFile),root=new URL('./.local-assets/',import.meta.url),source=JSON.parse(await readFile(new URL('./adult-swim-sources.json',import.meta.url)));
await mkdir(new URL('packages/',root),{recursive:true});
const output=[],failures=[];let cursor=0;let previous=new Map();try{previous=new Map(JSON.parse(await readFile(new URL('adult-swim-catalog.json',root))).games.map(g=>[g.id,g]));}catch{}
const digest=b=>createHash('sha256').update(b).digest('hex');
await Promise.all(Array.from({length:4},async()=>{while(cursor<source.length){const game=source[cursor++];
 const record={id:game.id,title:game.title,developer:game.developer,publisher:game.publisher,category:'flash',tags:game.tags,archiveStatus:game.status,archiveNotes:game.notes,source:game.source,review:'Not gameplay checked',status:'needs-work'};
 try{
  const packs=[...game.gameData].sort((a,b)=>Date.parse(b.dateAdded)-Date.parse(a.dateAdded));
  if(!packs.length){record.reason='Legacy files need recovery';output.push(record);continue;}
  const pack=packs[0],url=`https://download.unstable.life/gib-roms/Games/${game.id}-${Date.parse(pack.dateAdded)}.zip`,zip=new URL('packages/'+game.id+'.zip',root);let bytes;
  try{bytes=await readFile(zip);}catch{}
  if(!bytes||digest(bytes)!==pack.sha256.toLowerCase()){
   const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('Archive returned HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length!==pack.size||digest(bytes)!==pack.sha256.toLowerCase())throw Error('Archive package integrity check failed');await writeFile(zip,bytes);
  }
  const destination=new URL('flashpoint/'+game.id+'/',root);await run('python3',[fileURLToPath(new URL('./unpack.py',import.meta.url)),fileURLToPath(zip),fileURLToPath(destination)],{maxBuffer:100000});
  const launch=new URL(pack.launchCommand.trim().replace(/^"|"$/g,''));const relative='content/'+launch.hostname+decodeURIComponent(launch.pathname);if(relative.split('/').includes('..'))throw Error('Unsafe launch path');
  const file=new URL(relative.split('/').map(encodeURIComponent).join('/'),destination);await stat(file);
  record.download=url;record.sha256=digest(bytes);record.bytes=bytes.length;
  if(!launch.pathname.toLowerCase().endsWith('.swf')){record.reason='Original launch needs a separate adapter';output.push(record);continue;}
  record.url='assets/flashpoint/'+game.id+'/'+relative.split('/').map(encodeURIComponent).join('/');record.status='installed';
  console.log('Installed: '+game.title);
 }catch(error){record.reason=error.message;failures.push({id:game.id,title:game.title,error:error.message});console.log('Needs work: '+game.title+' — '+error.message);}
 output.push(record);
}}));
try{const phones=JSON.parse(await readFile(new URL('android/phone-builds.json',root)));for(const phone of phones){const game=output.find(g=>g.title===phone.title);if(game){game.phone=phone;if(game.status!=='installed'){game.status='installed';game.frame=phone.frame;game.review='Modified phone build · not browser checked';delete game.reason;}}}}catch{}
for(const game of output){const old=previous.get(game.id);if(old?.cover)game.cover=old.cover;if(old?.sha256===game.sha256&&old?.check){game.check=old.check;game.review=old.review;}}
output.sort((a,b)=>a.title.localeCompare(b.title));await writeFile(new URL('adult-swim-catalog.json',root),JSON.stringify({acquiredAt:new Date().toISOString(),games:output,failures},null,2));console.log(JSON.stringify({catalog:output.length,installed:output.filter(g=>g.status==='installed').length,failures:failures.length}));

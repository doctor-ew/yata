import{execFileSync}from'node:child_process';import{readFile,writeFile,mkdir,rm,cp}from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';import{build}from'esbuild';import{createHash}from'node:crypto';import{fetchPublishedCatalog,REGISTRY_MANIFEST_PATH,PUBLISHED_MANIFEST_PATH,catalogCounts}from'../src/published-catalog.mjs';import{validateCatalog,MAX_IMPORT_BYTES}from'../src/domain.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),web=path.join(root,'www'),stage=path.join(root,'.stage');
await rm(stage,{recursive:true,force:true});execFileSync(process.execPath,['../scripts/build-static.mjs','--out',stage,'--base','/tv/'],{cwd:root,stdio:'inherit'});
await rm(web,{recursive:true,force:true});await mkdir(web,{recursive:true});await cp(stage,path.join(web,'tv'),{recursive:true});
// Bundle a verified catalog for cold launch; subsequent launches refresh public metadata.
let manifest,snapshot;
if(process.env.YATA_REVIEWED_CATALOG){
 snapshot=await readFile(process.env.YATA_REVIEWED_CATALOG,'utf8');const revision=createHash('sha256').update(snapshot).digest('hex');
 if(revision!==process.env.YATA_REVIEWED_REVISION)throw Error('Prepublication bundle differs from reviewed catalog.');const catalog=validateCatalog(JSON.parse(snapshot));if(!catalog.channelRegistry)throw Error('Prepublication bundle requires registry metadata.');
 manifest={version:2,requires:['channel-registry-v1'],channelIds:catalog.channelRegistry.channels.map(c=>c.id),revision,catalog:`data/catalogs/${revision}.json`,updatedAt:new Date().toISOString(),counts:catalogCounts(catalog)};
 console.log('Prepublication bundle: reviewed local snapshot, not a verified live publication.');
}else{
 const published=await fetchPublishedCatalog({fetcher:(url,options)=>fetch(new URL(url,'https://doctorew.com/tv/'),{...options,signal:AbortSignal.timeout(20000)})});
 if(!published.catalog)throw Error('Verified published catalog unavailable.');manifest=published.manifest;
 const response=await fetch(new URL(manifest.catalog,'https://doctorew.com/tv/'),{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Published snapshot unavailable.');snapshot=await response.text();
}
if(Buffer.byteLength(snapshot)>MAX_IMPORT_BYTES||createHash('sha256').update(snapshot).digest('hex')!==manifest.revision)throw Error('Catalog integrity check failed.');
await mkdir(path.join(web,'tv/data/catalogs'),{recursive:true});await writeFile(path.join(web,'tv',manifest.catalog),snapshot);await writeFile(path.join(web,'tv',manifest.version===2?REGISTRY_MANIFEST_PATH:PUBLISHED_MANIFEST_PATH),JSON.stringify(manifest)+'\n');
await build({entryPoints:[path.join(root,'runtime.mjs')],bundle:true,format:'esm',platform:'browser',external:['./src/app.mjs','./src/arcade-games.mjs'],outfile:path.join(web,'tv/native.mjs')});
const htmlPath=path.join(web,'tv/index.html');let html=await readFile(htmlPath,'utf8');html=html.replace('src="src/app.mjs"','src="native.mjs"').replace('width=device-width,initial-scale=1','width=device-width,initial-scale=1,viewport-fit=cover');html=html.replace('</head>','<style>html.native-app body{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}html.native-app .masthead{padding-top:1rem}button,a,input,select{touch-action:manipulation}</style></head>');await writeFile(htmlPath,html);
await writeFile(path.join(web,'index.html'),'<!doctype html><meta charset="utf-8"><title>YATA</title><meta http-equiv="refresh" content="0;url=/tv/index.html#watch"><a href="/tv/index.html#watch">Open YATA</a>');
await cp(path.join(root,'licenses'),path.join(web,'tv/licenses'),{recursive:true});
await rm(stage,{recursive:true,force:true});console.log(`Mobile web assets ready: ${manifest.counts.shows} collections, bundled catalog ${manifest.revision}`);

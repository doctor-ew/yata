// Reproduce the YATA-owned overlay without editing or publishing the shared source.
import {execFileSync}from'node:child_process';
import {readFile,copyFile,mkdir}from'node:fs/promises';
import path from'node:path';import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1];
if(!args.includes('--backend')||!args.includes('--out'))throw Error('Use --backend CHECKOUT --out NEW_DIRECTORY.');
const source=path.resolve(option('--backend')),out=path.resolve(option('--out')),overlay=path.join(root,'services/buddy-feedback'),config=JSON.parse(await readFile(path.join(overlay,'upstream.json'),'utf8'));
const revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();if(revision!==config.revision)throw Error('Backend revision differs from the reviewed overlay base.');
await mkdir(out,{recursive:false});execFileSync('git',['clone','--no-hardlinks',source,out],{stdio:'inherit'});execFileSync('git',['-C',out,'checkout','--detach',config.revision],{stdio:'inherit'});
execFileSync('git',['-C',out,'apply','--check',path.join(overlay,config.patch)],{stdio:'inherit'});execFileSync('git',['-C',out,'apply',path.join(overlay,config.patch)],{stdio:'inherit'});
await copyFile(path.join(overlay,config.module),path.join(out,'src',config.module));await copyFile(path.join(overlay,'feedback.test.cjs'),path.join(out,'test/feedback.test.cjs'));
console.log('Prepared guarded API feedback overlay: '+out);

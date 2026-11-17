import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
export async function buildArcade(output,{shellOnly=false}={}){
 const root=fileURLToPath(new URL('../arcade/',import.meta.url)),assets=path.join(root,'.local-assets');
 await mkdir(output,{recursive:true});if((await readdir(output)).length)throw Error('Release directory must be empty');
 const manifest=[];
 const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.swf':'application/x-shockwave-flash','.wasm':'application/wasm','.data':'application/octet-stream','.bin':'application/octet-stream','.zip':'application/zip','.xml':'application/xml','.mp3':'audio/mpeg','.wav':'audio/wav','.flv':'video/x-flv','.gif':'image/gif','.txt':'text/plain; charset=utf-8','.load':'application/octet-stream','.nes':'application/octet-stream','.z64':'application/octet-stream','.chd':'application/octet-stream','.dat':'application/octet-stream','.md':'text/plain; charset=utf-8'};
 const csp="default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; media-src 'self' blob: data:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'";
 async function add(source,name,value){
  const policy=name==='index.html'?csp.replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace("connect-src 'self'", "connect-src 'self' https://skippyts.doctorew.com https://challenges.cloudflare.com").replace("frame-src 'self'", "frame-src 'self' https://challenges.cloudflare.com"):csp;
  const ext=path.extname(name).toLowerCase();if(!types[ext]&&!/^LICENSE(?:_|$)/.test(path.basename(name))&&!['md5','version'].includes(path.basename(name)))throw Error('Unrecognized release file: '+name);
  let data=value??await readFile(source);if(ext==='.html')data=Buffer.from(data.toString().replace(/<head>/i,`<head><meta http-equiv="Content-Security-Policy" content="${policy}">`));
  const destination=path.join(output,name);await mkdir(path.dirname(destination),{recursive:true});await writeFile(destination,data);
  manifest.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),contentType:types[ext]||'text/plain; charset=utf-8'});
 }
 async function tree(relative){const directory=path.join(assets,relative);for(const item of await readdir(directory,{withFileTypes:true})){if(item.name.startsWith('.'))continue;const rel=path.posix.join(relative,item.name);if(item.isSymbolicLink())throw Error('Symlink in release: '+rel);if(item.isDirectory())await tree(rel);else if(item.isFile())await add(path.join(assets,rel),'assets/'+rel);}}
 for(const name of ['index.html','arcade.css','arcade.mjs','buddy.mjs','games.mjs','ports.mjs','expansion.mjs','launcher-catalog.json','flash.html','flash.mjs','console.html','console.mjs','manifest.webmanifest','service-worker.js','icon.svg','icon-192.png','icon-512.png'])await add(path.join(root,name),name);
 for(const name of ['catalog-feeds.mjs','arcade-catalog.mjs'])await add(path.join(root,'../src',name),'shared/'+name);
 if(shellOnly){await writeFile(path.join(output,'release-manifest.json'),JSON.stringify({shellOnly:true,files:manifest},null,2));return{output,shellOnly:true,files:manifest.length};}
 for(const dir of ['bible-fight','viva-caligula','emulatorjs','covers','flashpoint','qbert','donkey-kong','frogger','pitfall','space-invaders','star-raiders','spy-hunter','star-wars-arcade','ports-v12','port-icons','expansion'])await tree(dir);
 const phones=JSON.parse(await readFile(path.join(assets,'android/phone-builds.json'),'utf8'));
 for(const phone of phones){if(!/^assets\/android\/[a-z-]+\/web\/index\.html$/.test(phone.frame))throw Error('Invalid phone frame');await tree(phone.frame.slice(7,-11));}
 const catalog=JSON.parse(await readFile(path.join(assets,'adult-swim-catalog.json'),'utf8'));
 for(const game of catalog.games)for(const key of ['download','sha256','bytes','check'])delete game[key];
 await add(null,'assets/adult-swim-catalog.json',Buffer.from(JSON.stringify(catalog)));
 if(manifest.some(f=>/\.apk$|\/packages\/|phone-builds\.json|runtime-manifest|artwork-manifest/.test(f.name)))throw Error('Private preservation artifact in release');
 await writeFile(path.join(output,'release-manifest.json'),JSON.stringify({files:manifest},null,2));return {output,files:manifest.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0)};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const out=process.argv[process.argv.indexOf('--out')+1];if(!out||!process.argv.includes('--out'))throw Error('Provide --out');console.log(JSON.stringify(await buildArcade(path.resolve(out),{shellOnly:process.argv.includes('--shell-only')})));}

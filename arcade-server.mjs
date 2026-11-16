import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./arcade/',import.meta.url));
const types={'.webmanifest':'application/manifest+json','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml','.swf':'application/x-shockwave-flash','.wasm':'application/wasm','.data':'application/octet-stream','.flv':'video/x-flv','.gif':'image/gif','.dat':'application/octet-stream','.zip':'application/zip','.nes':'application/octet-stream','.md':'text/plain; charset=utf-8','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wav':'audio/wav','.bin':'application/octet-stream','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
export async function handleArcade(req,res){
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return false;}
 if(pathname!=='/arcade'&&!pathname.startsWith('/arcade/'))return false;
 if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){res.writeHead(403).end('Local arcade only');return true;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return true;}
 if(pathname==='/arcade'){res.writeHead(302,{Location:'/arcade/'}).end();return true;}
 try{
 let rel=pathname.slice('/arcade/'.length)||'index.html';
 if(rel.split('/').some(part=>part.startsWith('.'))||rel.includes('\0'))throw Error();
 if(rel.startsWith('assets/'))rel='.local-assets/'+rel.slice(7);
 if(rel.endsWith('/'))rel+='index.html';
 const target=await realpath(path.join(root,rel));
 const mime=types[path.extname(target)]||(/^LICENSE(?:_|$)/.test(path.basename(target))?'text/plain; charset=utf-8':null);
 if(!target.startsWith(root)||!mime)throw Error();
 const body=await readFile(target);
 const headers={'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: data:; worker-src 'self' blob:; media-src 'self' blob: data:; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"};
 res.writeHead(200,headers).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}return true;
}

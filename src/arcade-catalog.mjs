import {validateGameMetadata} from './catalog-feeds.mjs';
const cores=new Set(['mame2003_plus','mame2003','stella2014','vice_x64sc','fceumm','snes9x','genesis_plus_gx','gambatte','fbneo','mupen64plus_next','pcsx_rearmed']);
function asset(value){if(typeof value!=='string'||!/^assets\/[A-Za-z0-9._/-]+$/.test(value)||value.split('/').some(x=>x==='.'||x==='..'||!x)||value.length>500)throw Error('Invalid Arcade asset path.');return value;}
function frame(value){if(/^flash\.html\?game=[a-zA-Z0-9.-]+$/.test(value))return value;const path=asset(value);if(!path.endsWith('.html'))throw Error('Invalid Arcade player path.');return path;}
export function validateLauncherCatalog(raw){
 const metadata=validateGameMetadata(raw),games=raw.games.map((source,i)=>{
  const g={...metadata.games[i]};
  for(const key of['review','description','tag','developer','publisher','archiveNotes'])if(typeof source[key]==='string')g[key]=source[key].slice(0,2000);
  if(source.theme){if(!/^[a-z0-9-]{1,40}$/.test(source.theme))throw Error('Invalid Arcade theme.');g.theme=source.theme;}
  for(const key of['cover','portIcon','file'])if(source[key])g[key]=asset(source[key]);
  for(const key of['frame','originalFrame'])if(source[key])g[key]=frame(source[key]);
  if(source.phone?.frame)g.phone={frame:frame(source.phone.frame)};
  if(source.core){if(!cores.has(source.core))throw Error('Unsupported Arcade engine.');g.core=source.core;if(g.status==='installed'&&!g.file)throw Error('Game cartridge missing.');}
  if(source.filename){if(!/^[a-zA-Z0-9._-]{1,150}$/.test(source.filename))throw Error('Invalid cartridge filename.');g.filename=source.filename;}
  if(source.fighter===true)g.fighter=true;
  if(Array.isArray(source.tags))g.tags=source.tags.filter(t=>typeof t==='string').slice(0,20).map(t=>t.slice(0,100));
  return g;
 });return{version:1,games};
}

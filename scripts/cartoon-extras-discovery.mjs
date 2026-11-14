// Reviewed additional cartoon programs. Preserve full programs and embedded ads.
import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const selections=[
 {showId:'mister-t',title:'Mister T',items:['toons-07272025-0430-am','toons-08102025-0430-am','toons-08172025-0429-am','toons-08242025-0430-am','toons-09142025-0430-am','toons-09212025-0430-am','toons-10052025-0430-am','toons-10122025-0430-am','toons-10192025-0430-am'],notes:'Nine reviewed named episode recordings from MeTV Toons, with embedded commercials retained and labeled. These commercials cannot be disabled by YATA break settings. The uploader uses continuous episode numbering across seasons; season zero preserves that source sequence without asserting season-relative numbering.'},
 {showId:'frankenstein-impossibles',title:'Frankenstein Jr. and The Impossibles',items:['00003_20260809_0334'],notes:'Eighteen full English bundled programs, approximately 22 minutes each. Keep Frankenstein Jr. and Impossibles stories together. Number-only filenames provide collection order, not verified broadcast episode order; season zero retains that order. Five-minute extra excluded.'},
];
const shows=[];
for(const selection of selections){
 const episodes=[],searched=[];
 for(const itemId of selection.items){
  const metadataUrl=`https://archive.org/metadata/${itemId}`;
  const response=await fetch(metadataUrl,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error(`Metadata failed: ${response.status}`);
  const metadata=await response.json();
  const found=archiveEpisodes(itemId,metadata).filter(e=>e.durationSeconds>=1100&&e.durationSeconds<=2100);
  for(const e of found){
   e.season=0;
   if(selection.showId==='mister-t'){
    const title=String(metadata.metadata.title);const match=title.match(/episode\s+(\d+)\s+(.+?)\s+MeTV/i);
    if(!match)throw Error(`Missing episode title: ${itemId}`);
    e.number=Number(match[1]);e.title=`Mister T · ${match[2]} · recorded with commercials`;
   }else{e.number=episodes.length+1;e.title=`Frankenstein Jr. and The Impossibles · program ${e.number} · collection order`;}
   episodes.push(e);
  }
  searched.push({itemId,metadataUrl,title:metadata.metadata.title,language:metadata.metadata.language||null,retained:found.length});
 }
 if(!episodes.length)throw Error(`No candidate programs for ${selection.showId}`);
 shows.push({showId:selection.showId,title:selection.title,channel:'cartoons',notes:selection.notes,searched,episodes});
}
const all=shows.flatMap(s=>s.episodes);let cursor=0;
await Promise.all(Array.from({length:6},async()=>{while(cursor<all.length){const e=all[cursor++];const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});const ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();if(!ok)throw Error(`Source check failed: ${r.status}`);e.sources[0].availability='verified';}}));
const pack={checkedAt:new Date().toISOString(),provider:'archive',notes:['Reviewed additional original cartoon programs. Every retained source returned a successful small HTTP video range; this does not establish full decoding, complete-series availability, or rights status.'],shows};
await writeFile(new URL('../data/cartoon-extras-discovery.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');
console.log(JSON.stringify(shows.map(s=>({show:s.title,episodes:s.episodes.length}))));

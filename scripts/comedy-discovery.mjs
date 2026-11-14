// Reviewed full-episode item selections. Reads metadata and small HTTP ranges only.
import {writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
const selections=[
 {showId:'barney-miller',title:'Barney Miller',items:['barney-miller']},
 {showId:'mork-mindy',title:'Mork & Mindy',items:['1x-1-2-pilot']},
 {showId:'love-boat',title:'The Love Boat',items:['the-love-boat-s-1-e-10','the-love-boat-s-5-e-29','the-love-boat-9x-7-good-time-girls-iron-man-soap-war','the-love-boat-9x-8-trouble-in-paradise-no-more-mister-nice-guy-the-mermaid-and-the-cop']},
];
const pack={checkedAt:new Date().toISOString(),provider:'archive',notes:['Bounded reviewed source selection, not complete-series availability. Metadata and successful small HTTP video ranges do not establish decoding, spoken language, or rights status.','Exclude standalone Love Boat story excerpts; keep only complete named episode files. Mork pilot remains its combined file; no invented split points.','Barney Miller series item currently exposes only one eligible MP4.'],shows:[]};
for(const selection of selections){const episodes=[],items=[];
 for(const itemId of selection.items){
  const r=await fetch('https://archive.org/metadata/'+itemId,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Metadata '+r.status);const data=await r.json();
  const found=archiveEpisodes(itemId,data).filter(e=>e.durationSeconds>=1100&&e.durationSeconds<=6500&&(selection.showId!=='love-boat'||/The Love Boat/i.test(e.title)));
  for(const e of found){const filename=e.title.split('/').pop();const order=filename.match(/\bs[ ._-]*(\d+)[ ._-]*e[ ._-]*(\d+)/i)||filename.match(/\b(\d+)x[ ._-]*(\d+)/i);if(order){e.season=Number(order[1]);e.number=Number(order[2]);}e.title=filename.replace(/\.ia$/,'').replace(/\s+/g,' ').trim();
   const response=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});const ok=[200,206].includes(response.status)&&/video\/|octet-stream/i.test(response.headers.get('content-type')||'');await response.body?.cancel();e.sources[0].availability=ok?'verified':'unverified';if(!ok)throw Error('Source check failed '+response.status);episodes.push(e);
  }
  items.push({itemId,title:data.metadata?.title,metadataUrl:'https://archive.org/metadata/'+itemId,episodes:found.length});
 }
 pack.shows.push({showId:selection.showId,title:selection.title,channel:'comedy',items,episodes});console.log(selection.title,episodes.length);
}
await writeFile(new URL('../data/comedy-discovery.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');

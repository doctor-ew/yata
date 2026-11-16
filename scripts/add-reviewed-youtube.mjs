// User-supplied playlists are mixed collections: import only reviewed full programs.
import {readFile,writeFile} from 'node:fs/promises';
import {youtubeEpisodes} from '../src/bulk.mjs';
const [kojakFile,starskyFile]=process.argv.slice(2);
if(!kojakFile||!starskyFile)throw Error('Provide the two flat-playlist metadata JSON files.');
const file=new URL('../data/vintage-additions-discovery.json',import.meta.url),pack=JSON.parse(await readFile(file,'utf8'));
const picks=[['kojak',kojakFile,'https://www.youtube.com/playlist?list=PLiZCl6XIGf-hwfcHZpEPsayJ1hYk04seG',['Rwad7ZHeHq8']],['starsky-hutch',starskyFile,'https://www.youtube.com/playlist?list=PLiZCl6XIGf-isMDzeo5uHKRfo2ZtaGsgI',['jkm0uhtq41s','sdOIh8WoqVQ','Git3wbhgxwQ','EYZT1Pqh2iU','h_kS24VdDQg','cGl_Q0q1W3Y','cY85dFdtnjo','9OzC-x991h8','fhPimEDIpsY','06h4z7wsQ-A']]];
for(const[id,metadataFile,url,approved]of picks){const data=JSON.parse(await readFile(metadataFile,'utf8')),show=pack.shows.find(s=>s.showId===id);show.playlists=[{url,title:data.title,returnedEntries:data.entries.length,notes:'Reviewed subset only. Unrelated videos, compilations, short clips, foreign-language copies and later revival films excluded. Embedded playback is unverified.'}];
 for(const videoId of approved){const entry=data.entries.find(e=>e.id===videoId);if(!entry)throw Error('Reviewed video missing from playlist metadata.');const e=youtubeEpisodes(entry)[0];if(e.durationSeconds<2400||e.durationSeconds>6200)throw Error('Reviewed program has unexpected duration.');
  let order=e.title.match(/S(\d+)\s*E(\d+)/i)||e.title.match(/Season\s+(\d+)\s+Episode\s+(\d+)/i)||e.title.match(/\((\d+)\s*-\s*(\d+)\)/);if(order){e.season=+order[1];e.number=+order[2];}
  const known=show.episodes.find(x=>x.sources.some(s=>s.url===e.sources[0].url));if(known)continue;
  const same=order&&show.episodes.find(x=>x.season===e.season&&x.number===e.number);if(same)same.sources.push(...e.sources);else show.episodes.push(e);
 }
}
await writeFile(file,JSON.stringify(pack,null,2)+'\n');console.log(pack.shows.filter(s=>s.playlists).map(s=>({id:s.showId,items:s.episodes.length,youtubeSources:s.episodes.flatMap(e=>e.sources).filter(s=>s.provider==='youtube').length})));

// Import reviewed original-series metadata, then verify small public endpoint ranges. No video hosting.
import {readFile,writeFile} from 'node:fs/promises';
import {archiveEpisodes} from '../src/domain.mjs';
import {VIEWER_REQUEST_SHOWS} from '../src/viewer-requests.mjs';
const directory=process.argv[2];if(!directory)throw Error('Provide the reviewed Archive metadata directory.');
const items={
 gargoyles:['gargoyles-s-01-e-11-long-way-to-morning-480p-dvdrip_202601'],
 'gummi-bears':['gummi-bears-s-01-e-09-a-gummi-by-any-other-name','gummi-bears-s-02-e-12-my-gummi-lies-over-the-ocean','gummi-bears-s-03-e-07-day-of-the-beevilweevils','gummi-bears-s-04-e-15-top-gum','gummi-bears-s-05-e-11-beg-burrow-and-steal','gummi-bears-s-06-e-19-wings-over-dunwyn'],
 'tmnt-1987':['TMNTSEASON1'],
 animaniacs:['s-01-e-05-taming-of-the-screwy'],
 'tiny-toons':['12064','tinytoonsnightghoulery1995_202003','tinytoonspringbreak_201912'],
 'darkwing-duck':['darkwing-duck-1991_202601'],
 'rescue-rangers':['chip-n-dale-rescue-rangers-undercover-critters-1989-vhs','chip-and-dale-rescue-rangers-risky-beesness-1991-uk-vhs','chip-and-dale-rescue-rangers-duelling-dale-1992-uk-vhs'],
 'mighty-morphin-power-rangers':['mighty-morphin-power-rangers-season-1','mighty-morphin-power-rangers-season-2','mighty-morphin-power-rangers-season-3'],
};
const labels={
 '12064':'Tiny Toon Music Television · VHS collection (2 episodes)',
 tinytoonsnightghoulery1995_202003:'Tiny Toons’ Night Ghoulery (1995 special)',
 tinytoonspringbreak_201912:'Tiny Toon Spring Break (1994 special) · Hub rebroadcast',
 'chip-n-dale-rescue-rangers-undercover-critters-1989-vhs':'Undercover Critters · Adventures in Squirrelsitting / Three Men and a Booby · VHS collection',
 'chip-and-dale-rescue-rangers-risky-beesness-1991-uk-vhs':'Risky Beesness · Bearing Up Baby / Risky Beesness · VHS collection',
 'chip-and-dale-rescue-rangers-duelling-dale-1992-uk-vhs':'Duelling Dale · Mind Your Cheese and Q’s / The S.S. Drainpipe / A Creep in the Deep · VHS collection',
};
const shows=[],excluded=[];
let previous = null;
try { previous = JSON.parse(await readFile(new URL('../data/viewer-requests-discovery.json',import.meta.url),'utf8')); } catch {}
const fresh = previous && Date.now()-Date.parse(previous.checkedAt)<3600000;
const checked = new Map(fresh ? previous.shows.flatMap(s=>s.sourceChecks.filter(c=>c.verified).map(c=>[c.url,c])) : []);
for(const def of VIEWER_REQUEST_SHOWS){
 const episodes=[];
 for(const item of items[def.id]){
  const metadata=JSON.parse(await readFile(`${directory}/${item}.json`,'utf8'));
  // Prefer Archive's AVC derivatives when both original and derivative files are present.
  const files=[...metadata.files].sort((a,b)=>Number(/^h\.264/i.test(b.format||''))-Number(/^h\.264/i.test(a.format||'')));
  for(const episode of archiveEpisodes(item,{...metadata,files})){
   if(!episode.durationSeconds||episode.durationSeconds<500||episode.durationSeconds>5000||/extra|show pitch|intro only|s\d+e0+(?:\D|$)/i.test(episode.title)){
    excluded.push({showId:def.id,title:episode.title,reason:'Extra, special episode zero, short clip or duration outside reviewed bounds.'});continue;
   }
   if(def.id==='mighty-morphin-power-rangers'&&/official fan club|karate club|alpha.s magical christmas|misadventures of bulk/i.test(episode.title)){excluded.push({showId:def.id,title:episode.title,reason:'Bonus home-video presentation, not a numbered series episode.'});continue;}
   episode.title=episode.title.replace(/\.ia$/i,'');
   if(labels[item]){episode.title=labels[item];episode.season=0;episode.number=episodes.length+1;}
   if(def.id==='gargoyles'&&episode.season===0)throw Error('Gargoyles requires explicit reviewed season/episode numbering.');
   const duplicate = episode.season>0 ? episodes.find(e=>e.season===episode.season&&e.number===episode.number) : null;
   if(duplicate){
    const prefer = /\(Original\)/i.test(episode.title);
    excluded.push({showId:def.id,title:prefer?duplicate.title:episode.title,reason:'Alternative edit of an already numbered episode; prefer the explicitly original edit.'});
    if(!prefer)continue;
    episodes.splice(episodes.indexOf(duplicate),1);
   }
   episodes.push(episode);
  }
 }
 episodes.sort((a,b)=>a.season-b.season||a.number-b.number);
 shows.push({showId:def.id,title:def.title,channel:def.channel,items:items[def.id],episodes,sourceChecks:[],notes:labels[items[def.id][0]]?'Intact collections/specials; do not represent the individual stories as separate files.':'Original-series files; endpoint checks are not proof of every decoded frame or complete series coverage.'});
}
// Grimm's existing compilation remains intact. Unverified VHS editions are deliberately excluded.
const rows=shows.flatMap(show=>show.episodes.map(episode=>({show,episode})));let cursor=0;
await Promise.all(Array.from({length:8},async()=>{while(cursor<rows.length){const{show,episode}=rows[cursor++];const prior=checked.get(episode.sources[0].url);if(prior){show.sourceChecks.push(prior);continue;}let status=null,type=null,ok=false;for(let retry=0;retry<2&&!ok;retry++)try{const response=await fetch(episode.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(18000)});status=response.status;type=response.headers.get('content-type');ok=[200,206].includes(status)&&/video\/|octet-stream/i.test(type||'');await response.body?.cancel();}catch{}show.sourceChecks.push({url:episode.sources[0].url,method:'GET bytes=0-1023',status,contentType:type,verified:ok});if(!ok){show.episodes=show.episodes.filter(e=>e!==episode);excluded.push({showId:show.showId,title:episode.title,reason:'Public MP4 endpoint verification failed.',status});}}}));
const pack={checkedAt:new Date().toISOString(),provider:'archive',notes:['Videos remain on their original provider. Metadata/range checks establish identity and current endpoint access, not distribution rights, full decoding or future availability.','Tiny Toons and Rescue Rangers currently use labelled intact collections/specials. TMNT currently covers the original first season only.','Gargoyles preserves explicit chronological episode order. Grimm’s still has one verified compilation; other editions require visual identity checks.'],shows,excluded};
await writeFile(new URL('../data/viewer-requests-discovery.json',import.meta.url),JSON.stringify(pack,null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,items:s.episodes.length})),excluded:excluded.length}));

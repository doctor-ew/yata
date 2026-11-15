import{writeFile}from'node:fs/promises';import{archiveEpisodes}from'../src/domain.mjs';
const picks=[
 ['ycdtotv','You Can’t Do That on Television','comedy',['YCDTOT_TCC'],1100,4500],
 ['turkey-tv','Turkey Television','comedy',['turkey-television','turkey-tv'],900,3500],
 ['harvey-birdman','Harvey Birdman, Attorney at Law','late-night',['harvey-birdman-attorney-general-information'],500,1500],
 ['sealab-2021','Sealab 2021','late-night',['sealab-2021-complete'],500,1600],
 ['home-movies','Home Movies','late-night',['home-movies'],1000,1800],
 ['brak-show','The Brak Show','late-night',['TBS-SEASON1','the.-brak.-show.-s-02-e-05.720p.-hmax.-webrip.x-264-galaxy-tv','TBSS3'],500,1500],
 ['taxi','Taxi (1978)','comedy',['Taxi1x14SugarMama','TaxiS02E08TheGreatRace','TaxiS03E07TheCallOfTheMild','TaxiS04E12BobbyDoesntLiveHereAnymore','Episode1TheShloogelShowLoveUnAmericanStyle'],1100,2000],
 ['rockford-files','The Rockford Files','seventies',['the-rockford-files-1974-1980-complete-series'],2400,6000],
 ['bionic-woman','The Bionic Woman (1976)','action',['the-bionic-woman'],2400,3600],
 ['josie-pussycats','Josie and the Pussycats (1970)','cartoons',['josie_and_the_pussycats'],1000,1600],
 ['adult-swim-bumps','Adult Swim · vintage bumps','late-night',['adult-swim-first-aid-how-to-bumper-brak-heimlich-maneuver-early-2003-crown-princ'],3,60],
 ['nickelodeon-bumps','Nickelodeon · vintage bumps','cartoons',['nickelodeon-bumper-notepad-nick-jingle','nickelodeon-bumper-nick-is-kids','nickelodeon-bumper-nick-is-everyday','nickelodeon-bumper-favorite-words-nick-is-what-you-want','nickelodeon-ident-dinosaur','nickelodeon-ident-rhino-ballet','y-2meta.app-nickelodeon-bumper-early-1980s-240p'],3,60],
];
const search=await fetch('https://archive.org/advancedsearch.php?'+new URLSearchParams({q:'title:(WKRP) AND title:(Season) AND mediatype:movies',output:'json',rows:'50','fl[]':'identifier'}));if(!search.ok)throw Error('WKRP search failed');const docs=(await search.json()).response.docs;const wkrp=docs.filter(d=>d.identifier.startsWith('wkrp-in-cincinnati-season-')).slice(0,12).map(d=>d.identifier);picks.push(['wkrp','WKRP in Cincinnati','comedy',wkrp,1100,4000]);
const shows=[];
for(const[showId,title,channel,items,min,max]of picks){const episodes=[],sources=[],seen=new Set();
 for(const itemId of items){const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Metadata failed: '+itemId);const m=await r.json();sources.push({itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`});
  for(const e of archiveEpisodes(itemId,m)){
   const path=decodeURIComponent(new URL(e.sources[0].url).pathname),file=path.split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');
   if(e.durationSeconds<min||e.durationSeconds>max||seen.has(file.toLowerCase()))continue;
   if(showId==='sealab-2021'&&/S00E|\/Extras\//i.test(path))continue;
   if(showId==='ycdtotv'&&!/^S\d+E\d+/i.test(file))continue;
   if(showId==='turkey-tv'&&!/turkey/i.test(file))continue;
   if(showId==='harvey-birdman'&&!/\/S\s*\d+\//i.test(path))continue;
   if(showId==='bionic-woman'&&!/^The Bionic Woman S\d/i.test(file))continue;
   seen.add(file.toLowerCase());const order=file.match(/s(\d+)\s*e(\d+)|(\d+)x(\d+)/i);e.title=file.replace(/\.mp4$/i,'');e.season=order?Number(order[1]||order[3]):0;e.number=order?Number(order[2]||order[4]):episodes.length+1;
   if(showId==='harvey-birdman'){e.season=Number(path.match(/\/S\s*(\d+)\//i)[1]);e.number=Number(file.match(/EP\s*(\d+)/i)?.[1]||e.number);}
   if(showId==='wkrp'){e.title=String(m.metadata.title)+' · intact source program';e.season=0;e.number=episodes.length+1;}
   if(showId.endsWith('-bumps')){e.kind='bumper';e.title=title+' · '+e.title;}
   if(showId==='sealab-2021'&&/S00E|\/Extras\//i.test(path))continue;
   if(showId==='ycdtotv'||showId==='turkey-tv')e.title+=' · source recording; embedded breaks may remain';
   episodes.push(e);
  }
 }
 shows.push({showId,title,channel,items:sources,notes:'Reviewed source programs; bundled recordings and embedded breaks remain intact. Counts are source programs, not a complete-series claim. Unknown ordering remains season zero. Trailers, films, unrelated extras, and long bumper montages are excluded.',episodes});
}
shows.push({showId:'daria',title:'Daria',channel:'late-night',notes:'Wishlist. The bounded search found promos and a torrent-only listing, not an accessible full-program MP4. Do not schedule a trailer as an episode.',episodes:[]});
let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
await writeFile(new URL('../data/network-expansion-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive',notes:['HTTP video-range checks establish endpoint availability only; sampled decoding is recorded separately. They do not establish full playback, language, completeness, or rights.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,items:s.episodes.length})),excluded:excluded.length}));

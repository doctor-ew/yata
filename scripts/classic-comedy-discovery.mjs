import{writeFile}from'node:fs/promises';import{archiveEpisodes}from'../src/domain.mjs';
const picks=[
 ['fat-albert','Fat Albert and the Cosby Kids','cartoons','fat-albert-72',1000,1800],
 ['good-times','Good Times','comedy','good-times-Lando18',1100,2000],
 ['jeffersons','The Jeffersons','comedy','the-jeffersons-Lando18',1100,2100],
 ['sanford-son','Sanford and Son','comedy','od-and-so-n-06-r-01',1100,2000],
 ['gimme-break','Gimme a Break!','comedy','ge-a-b-s-6-e-0-m-g-t-c',1100,2100],
 ['kotter','Welcome Back, Kotter','comedy','me-bk-kr-s-02-e-09-o-ms.-c',1100,2000],
];
const shows=[];
for(const[showId,title,channel,itemId,min,max]of picks){const r=await fetch(`https://archive.org/metadata/${itemId}`,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Metadata failed: '+itemId);const m=await r.json(),seen=new Set(),episodes=[];
 for(const e of archiveEpisodes(itemId,m)){
  if(e.durationSeconds<min||e.durationSeconds>max)continue;
  const file=decodeURIComponent(new URL(e.sources[0].url).pathname).split('/').pop().replace(/\.ia(?=\.mp4$)/i,'');if(seen.has(file.toLowerCase()))continue;seen.add(file.toLowerCase());e.title=file.replace(/\.mp4$/i,'');const order=file.match(/s(\d+)\s*e(\d+)|(\d+)x(\d+)/i);e.season=order?Number(order[1]||order[3]):0;e.number=order?Number(order[2]||order[4]):episodes.length+1;episodes.push(e);
 }
 shows.push({showId,title,channel,items:[{itemId,title:m.metadata.title,metadataUrl:`https://archive.org/metadata/${itemId}`}],notes:'Original-era source programs. Duplicate generated encodes collapsed by filename; movies, promos and out-of-duration extras excluded. Collection labels are not a completeness guarantee.',episodes});
}
let cursor=0;const all=shows.flatMap(s=>s.episodes.map(e=>({s,e}))),excluded=[];
await Promise.all(Array.from({length:8},async()=>{while(cursor<all.length){const{s,e}=all[cursor++];let ok=false;try{const r=await fetch(e.sources[0].url,{headers:{Range:'bytes=0-1023'},signal:AbortSignal.timeout(25000)});ok=[200,206].includes(r.status)&&/video\/|octet-stream/i.test(r.headers.get('content-type')||'');await r.body?.cancel();}catch{}if(!ok){s.episodes=s.episodes.filter(x=>x!==e);excluded.push({showId:s.showId,url:e.sources[0].url});}}}));
const tubi='https://tubitv.com/series/0300008050/who-s-the-boss';const r=await fetch(tubi,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Tubi listing unavailable: '+r.status);await r.body?.cancel();
shows.push({showId:'whos-boss',title:'Who’s the Boss?','channel':'comedy',notes:'Official Tubi series listing only. Opens externally and never enters live rotation. Region/provider availability may vary.',episodes:[{id:'whos-boss-tubi',title:'Full series · watch on Tubi',season:0,number:0,durationSeconds:null,kind:'episode',group:'',sources:[{id:'whos-boss-tubi-source',provider:'tubi',url:tubi,availability:'verified'}]}]});
await writeFile(new URL('../data/classic-comedy-discovery.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),provider:'archive and official Tubi',notes:['Small HTTP range checks establish endpoint availability, not full decoding, language, rights or completeness. External pages do not enter station rotation. BraveStarr already exists and is not duplicated.'],excluded,shows},null,2)+'\n');console.log(JSON.stringify({shows:shows.map(s=>({id:s.showId,items:s.episodes.length})),excluded:excluded.length}));

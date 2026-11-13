// Reviewed Archive item choices; refreshes public MP4 metadata without downloading media.
import { createSeed } from '../src/catalog.mjs';
import { archiveEpisodes } from '../src/domain.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const output = new URL('../data/action-discovery.json', import.meta.url);
const requested = process.env.ACTION_SHOWS?.split(',').map(id => id.trim()).filter(Boolean);
const previous = requested ? JSON.parse(await readFile(output, 'utf8')) : null;
const cache = process.env.ACTION_METADATA_CACHE || path.join(tmpdir(), 'drew-tv-action-metadata');
await mkdir(cache,{recursive:true});
const selected = {
 'dukes':['the-dukes-of-hazzard-1x-04-repo-men'],
 'knight-rider':['knight-rider-1982-1986-complete-series_202609'],
 'greatest-american-hero':['the.-greatest.-american.-hero.-s-01-e-01-e-02-pilot-ufo-encounter.-the-greatest-'],
 'airwolf':['e_20251020'],
 'a-team':['the-a-team-tv-series-1983-1987-complete-series-tv-pg'],
 'fall-guy':['the-fall-guy-1981-1986'],
 'macgyver':['macgyver-collection-1985--to-1994'],
 'magnum':['magnum-p.-i.-season-4-episode-04-distant-relative-1542040354385','magnum-p.-i.-s-08-e-12-e-13-resolutions-1-2-original-broadcast-version','memories-are-forever-sound'],
 'chips':[],
 'simon':['simon-and-simon-the-lost-episodes','simon-and-simon-s-01-e-03-trapdoors-1080p'],
 'riptide':['s-1-e-1-pilot_202603','s-2-e-2-the-orange-grove','s-3-e-3-does-not-compute'],
 'hardcastle':['s_20251114'],
 'automan':['automan-complete-series-1983'],
 'street-hawk':['street-hawk-complete-series-1985'],
 'manimal':['manimal-complete-series-1983'],
 'phoenix':['the-phoenix-complete-series-1982'],
 'voyagers':['voyagers-s-01-e-17-destinys-choice'],
 'buck-rogers':['buck-rogers-in-the-25th-century-complete-series-1979'],
 'battlestar':['battlestar-galactica-complete-series-1978'],
 'v':[],
 'hulk':['the.incredible.hulk.s01e07.1080p.bluray.x264-ghouls'],
 'wizards-warriors':['wizards-and-warriors-s-01-e-08-vulkars-revenge'],
 'matthew-star':['the-powers-of-matthew-star-s-01-e-01-jackal'],
 'misfits-science':['misfits-of-science-complete-series-1985'],
 'otherworld':['otherworld-episode-2-the-zone-troopers-build-men'],
 'whiz-kids':['whiz-kids'],
};
async function get(url) {
 const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error(`Metadata request HTTP ${response.status}`);
 return response.json();
}
async function search(q) {
 const url=new URL('https://archive.org/advancedsearch.php');
 for(const [k,v]of Object.entries({q,output:'json',rows:'100',page:'1'}))url.searchParams.set(k,v);
 url.searchParams.append('fl[]','identifier');url.searchParams.append('fl[]','title');
 const data=await get(url);return {query:q,numFound:data.response.numFound,rowsReturned:data.response.docs.length,docs:data.response.docs};
}
const searches={};
if (!requested || requested.includes('chips')) {
searches.chips=await search('title:("CHiPs") AND (title:(1x*) OR title:(2x*) OR title:(3x*) OR title:(4x*) OR title:(5x*) OR title:(6x*)) AND mediatype:movies');
selected.chips=searches.chips.docs.filter(d=>/^chips\s+\d+x/i.test(d.title)).map(d=>d.identifier);
}
if (!requested || requested.includes('v')) {
searches.v=await search('title:("V") AND (title:("1984") OR title:("1985") OR title:("Final Battle")) AND mediatype:movies');
selected.v=searches.v.docs.filter(d=>/^V The Series\b/i.test(d.title)).map(d=>d.identifier);
}
if (requested?.some(id => !Object.hasOwn(selected, id))) throw Error('ACTION_SHOWS contains an unknown show.');
async function metadata(itemId){
 const file=path.join(cache,`${itemId}.json`);
 try{return JSON.parse(await readFile(file,'utf8'));}catch{}
 const data=await get(`https://archive.org/metadata/${itemId}`);await writeFile(file,JSON.stringify(data));return data;
}
const result={checkedAt:new Date().toISOString(),provider:'archive',bounds:{searchRows:100,searchPages:1,metadataConcurrency:3,requestTimeoutMs:25000},notes:['Curated public MP4 metadata only; not a claim of full-series completeness, English audio verification, playback decoding or rights status.','Series items reviewed against metadata titles and filenames; unrelated adaptations, clips, disc dumps, audio fan-fiction and crossovers from other shows excluded.','Combined episodes remain one media entry; no invented split points.','Unavailable and non-MP4 files are excluded. Metadata language can be unknown.'],shows:[]};
for(const show of createSeed().shows.filter(s=>s.channel==='action' && (!requested || requested.includes(s.id)))){
 const itemIds=selected[show.id]||[];const items=[];let cursor=0;
 await Promise.all(Array.from({length:3},async()=>{while(cursor<itemIds.length){const itemId=itemIds[cursor++];try{
  const data=await metadata(itemId); const lang=String(data.metadata?.language||'');
  if(show.id!=='whiz-kids'&&lang&&!/english|eng|^en$/i.test(lang)){items.push({itemId,title:data.metadata?.title,language:lang,episodes:[],error:'Non-English metadata language excluded'});continue;}
  let episodes=archiveEpisodes(itemId,data).filter(e=>{
   if(e.durationSeconds!==null&&(e.durationSeconds<1100||e.durationSeconds>8500))return false;
   if(show.id==='whiz-kids') {
    const file = decodeURIComponent(new URL(e.sources[0].url).pathname).slice(('/download/'+itemId+'/').length);
    if(!file.startsWith('EN - VHS - Whiz Kids (1 - 18)/Syndicated (1-18)/272p/'))return false;
    if(!/^Whiz Kids - (\d+)x(\d+) - (.+)\.mp4$/i.test(file.split('/').pop()))return false;
   }
   if(/\b(trailer|promo|sample|intro|outro|credits|featurette)\b/i.test(e.title))return false;
   if(show.id==='magnum' && itemId!=='memories-are-forever-sound' && !/magnum/i.test(e.title))return false;
   return true;
  });
  for(const e of episodes){
   if(show.id==='whiz-kids')e.title=e.title.split('/').pop();
   const order=e.title.match(/\bs[ ._-]*(\d{1,2})[ ._-]*e[ ._-]*(\d{1,3})/i)||e.title.match(/\b(\d{1,2})[ ._-]*x[ ._-]*(\d{1,3})/i)||e.title.match(/season[ ._-]*(\d+)[ ._-]*episode[ ._-]*(\d+)/i);
   if(order){e.season=Number(order[1]);e.number=Number(order[2]);}
   if(['v','otherworld'].includes(show.id) && !order) { const number=e.title.match(/Episode[ ._-]*(\d+)/i); if(number)e.number=Number(number[1]); }
   e.title=e.title.replace(/\.ia$/i,'').replace(/[._]+/g,' ').replace(/\s+/g,' ').trim();
  }
  items.push({itemId,title:data.metadata?.title||itemId,language:lang||null,episodes});
 }catch(e){items.push({itemId,error:e.message,episodes:[]});}}}));
 // Preserve chosen item precedence independent of request completion order.
 items.sort((a,b)=>itemIds.indexOf(a.itemId)-itemIds.indexOf(b.itemId));
 const known=new Map();for(const item of items)for(const e of item.episodes){
  const key=show.id==='v'?`episode:${e.number}`:e.season?`${e.season}:${e.number}`:e.title.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!known.has(key))known.set(key,e);
  else if(show.id==='v' && !known.get(key).season && e.season)known.get(key).season=e.season;
 }
 const episodes=[...known.values()].sort((a,b)=>a.season-b.season||a.number-b.number);
 const extraNotes = { 'wizards-warriors':['English eight-episode collection with explicit season/episode numbering.'], 'matthew-star':['English 22-entry source sequence; source episode 22 is labeled Starr Knight pilot. Source numbering is preserved, not independently reconstructed broadcast order.'], 'misfits-science':['English 16-entry collection; the approximately 92-minute pilot is one intact media entry. This show dates from 1985.'], otherworld:['English eight-entry collection; explicit Episode numbers are retained with season zero. This show dates from 1985.'], 'whiz-kids':['Mixed-language collection: retain only the EN - VHS - Whiz Kids (1 - 18)/Syndicated (1-18)/272p/ directory and explicit Whiz Kids season/episode filenames. Exclude French material, alternate encodes, crossovers and cut scenes. Language is indicated by the chosen directory rather than independently verified audio.'] };
 episodes.forEach((e,index)=>e.id=`action-${show.id}-${index}`);
 result.shows.push({showId:show.id,title:show.title,episodes,searched:[...(searches[show.id]?[Object.fromEntries(Object.entries(searches[show.id]).filter(([k])=>k!=='docs'))]:[]),{reviewedItemCount:itemIds.length}],items:items.map(({episodes,...item})=>({...item,accepted:episodes.length})),notes:[...(extraNotes[show.id]||[]),...(show.id==='hulk'?['Season-1 collection has no audio-language metadata; English audio has not been verified. Older Death in the Family filename used conflicting episode numbering and was omitted.']:[]),...(show.id==='simon'?['Trapdoors MP4 is an Archive h.264 derivative of an HEVC-named MKV; filename alone does not identify the actual derivative codec.']:[]),...(show.id==='magnum'?['Memories Are Forever I & II is retained as one combined broadcast file with unknown season and episode ordering.']:[]),...(show.id==='chips'?['Selected matching television filenames; audio language is absent from source metadata and has not been verified.']:[]),...(show.id==='macgyver'?['Includes two explicitly labeled 1994 TV movies in addition to numbered series files.']:[]),'Counts are media entries found, not verified episode inventory totals.','No full-series completeness claim. Missing runtime remains unknown.']});
 console.log(show.id,episodes.length,items.filter(x=>x.error).map(x=>[x.itemId,x.error]));
 if (!requested) await writeFile(output,JSON.stringify(result,null,2));
}

if (requested) {
 if (result.shows.some(show => !show.episodes.length)) throw Error('Partial refresh found an empty show; previous discovery pack is unchanged.');
 result.shows.push(...previous.shows.filter(show => !requested.includes(show.showId)));
 const order = createSeed().shows.map(show => show.id);
 result.shows.sort((a,b) => order.indexOf(a.showId) - order.indexOf(b.showId));
 result.previousCheckedAt = previous.checkedAt;
 result.updatedShows = requested;
 result.notes.push('Partial refresh preserves earlier show records; updatedShows identifies refreshed collections.');
 await writeFile(output,JSON.stringify(result,null,2)+'\n');
}

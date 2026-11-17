import {browseLibrary} from './library-browser.mjs';
import {stationSource} from './domain.mjs';
const normalized=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function isEpisodeCollection(episode) {
 return episode.season===0||/\b(?:compilation|collection|multi[ -]episode|vhs|recording|recorded broadcast|intact tape)\b/i.test(episode.title);
}
export function resolveEpisodeSearchResult(catalog,reference) {
 if(!reference||typeof reference.showId!=='string'||typeof reference.episodeId!=='string')return null;
 const show=catalog?.shows?.find(s=>s.id===reference.showId),episode=show?.episodes.find(e=>e.id===reference.episodeId);
 if(!episode||episode.kind!=='episode'||!(episode.durationSeconds>0))return null;
 const source=stationSource(episode);
 if(!source||reference.sourceId!==undefined&&reference.sourceId!==source.id)return null;
 return {show,episode,source};
}
export function searchEpisodes(catalog,{query='',metadata={},filters={},limit=50}={}) {
 if(typeof query!=='string'||query.length>200)return {results:[],total:0,invalid:true};
 const phrase=normalized(query),tokens=phrase.split(' ').filter(Boolean);
 if(phrase.length<2||tokens.length>12)return {results:[],total:0,invalid:phrase.length>=2};
 const cap=Number.isInteger(limit)?Math.max(1,Math.min(100,limit)):50;
 const shows=browseLibrary(catalog?.shows||[],metadata,{...filters,query:''}),matches=[];
 for(const show of shows){
  const showTitle=normalized(show.title);
  for(const episode of show.episodes){
   if(episode.kind!=='episode')continue;
   const episodeTitle=normalized(episode.title),hay=showTitle+' '+episodeTitle;
   if(!tokens.every(token=>hay.includes(token)))continue;
   const source=episode.durationSeconds>0?stationSource(episode):null;
   matches.push({showId:show.id,episodeId:episode.id,sourceId:source?.id||null,showTitle:show.title,episodeTitle:episode.title,season:episode.season,number:episode.number,collection:isEpisodeCollection(episode),playable:!!source,score:episodeTitle===phrase?3:episodeTitle.includes(phrase)?2:1});
  }
 }
 matches.sort((a,b)=>b.score-a.score||a.showTitle.localeCompare(b.showTitle,'en',{numeric:true,sensitivity:'base'})||a.season-b.season||a.number-b.number||a.episodeTitle.localeCompare(b.episodeTitle,'en',{numeric:true,sensitivity:'base'}));
 return {results:matches.slice(0,cap).map(({score,...result})=>result),total:matches.length,invalid:false};
}

import {createHash} from 'node:crypto';
import {matchEpisode} from './episode-information.mjs';
import {isEpisodeCollection} from './episode-search.mjs';
import {stationSource} from './domain.mjs';
const normalize=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'');
// Exact identity normalization only: no fuzzy similarity, season offsets or plot guesses.
export function canonicalEpisodeTitle(value,showTitle='') {
 let text=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 text=text.replace(/\.(?:mp4|mkv|avi|mov|m4v|webm|srt|vtt)$/i,'');
 text=text.replace(/\s*\([^)]*(?:\b\d{3,4}p\b|dvd[ -]?rip|bluray|blu-ray|hdtv|web[ -]?dl|x26[45]|h[ .]?26[45])[^)]*\)\s*$/i,'');
 const words=String(showTitle).replace(/\s*\(\d{4}(?:[–-]\d{4})?\)\s*$/,'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]+/g);
 if(words?.length)text=text.replace(new RegExp('^'+words.join('[\\W_]*')+'(?:[\\W_]+|$)'),'');
 text=text.replace(/^[\W_]*(?:s\d+\s*e\d+|\d{1,2}x\d{1,3})(?:[\W_]+|$)/i,'').trim();
 const parts={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};
 const suffix=text.match(/(?:\(?\bpart[\s._:-]*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\)?|\((\d{1,2})\))[\s.!?,:;-]*$/i);
 let part=null;
 if(suffix){part=parts[suffix[1]]??Number(suffix[1]||suffix[2]);text=text.slice(0,suffix.index);}
 return {base:normalize(text),part};
}
function canonicalMatch(episode,candidates,showTitle){
 const wanted=canonicalEpisodeTitle(episode.title,showTitle);
 if(!wanted.base)return null;
 const exact=candidates.filter(item=>{const found=canonicalEpisodeTitle(item.name);return found.base===wanted.base&&found.part===wanted.part;});
 const numbered=exact.filter(item=>item.season===episode.season&&item.number===episode.number);
 if(numbered.length===1)return numbered[0];
 return exact.length===1?exact[0]:null;
}
export function plainSummary(html) {
 if(typeof html!=='string'||html.length>30000)return '';
 const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',hellip:'…'};
 return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(entity,key)=>{
  if(key[0]!=='#')return named[key.toLowerCase()]??entity;
  const number=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
  return number>0&&number<=0x10ffff&&!(number>=0xd800&&number<=0xdfff)?String.fromCodePoint(number):' ';
 }).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,3000);
}
export function standaloneEpisode(episode) {
 if(episode.kind!=='episode'||!Number.isInteger(episode.season)||episode.season<1||!Number.isInteger(episode.number)||episode.number<1||!(episode.durationSeconds>0&&episode.durationSeconds<=5400)||isEpisodeCollection(episode)||!stationSource(episode))return false;
 if(/\b(?:partial|incomplete|trailer|excerpt|clips?|antenna tv|modern ads|multi[ -]episode|vhs)\b/i.test(episode.title)||/[|/]/.test(episode.title))return false;
 return (episode.title.match(/s\d+\s*e\d+/gi)||[]).length<=1;
}
export function buildEpisodeEvidence({show,episode,providerEpisodes,providerShowId,catalogRevision,fetchedAt}) {
 if(!/^[a-f0-9]{64}$/.test(catalogRevision)||!Number.isFinite(Date.parse(fetchedAt)))throw Error('Evidence requires a verified catalog revision and fetch timestamp.');
 if(!standaloneEpisode(episode))return {document:null,reason:'not-standalone-checked'};
 const canonical=canonicalMatch(episode,providerEpisodes,show.title),match=canonical||matchEpisode(episode,providerEpisodes,show.title);
 if(!match)return {document:null,reason:'no-unambiguous-match'};
 const catalogTitle=canonicalEpisodeTitle(episode.title,show.title),providerTitle=canonicalEpisodeTitle(match.name);
 if(catalogTitle.base&&catalogTitle.part!==providerTitle.part)return {document:null,reason:'multipart-title-mismatch'};
 // A unique title is insufficient when catalog and provider numbering conflict.
 if(match.season!==episode.season||match.number!==episode.number)return {document:null,reason:'conflicting-numbering'};
 // Provider runtime is often a broadcast slot; 48 ad-free minutes can match 60,
 // but one 48-minute installment cannot inherit a 120-minute premiere summary.
 if(match.runtime!==null&&match.runtime!==undefined){
  if(typeof match.runtime!=='number'||!Number.isFinite(match.runtime)||match.runtime<=0)return {document:null,reason:'invalid-provider-runtime'};
  const ratio=episode.durationSeconds/(match.runtime*60);
  if(ratio<0.65||ratio>1.2)return {document:null,reason:'runtime-scope-mismatch'};
 }else if(catalogTitle.part!==null||providerTitle.part!==null)return {document:null,reason:'multipart-scope-uncertain'};
 const source=stationSource(episode),summary=plainSummary(match.summary);
 if(!summary)return {document:null,reason:'no-summary'};
 if(!Number.isSafeInteger(match.id)||match.id<1||!Number.isSafeInteger(providerShowId)||providerShowId<1)return {document:null,reason:'invalid-provider-identity'};
 let url;try{url=new URL(match.url);}catch{return {document:null,reason:'invalid-provider-url'};}
 if(url.protocol!=='https:'||url.hostname!=='www.tvmaze.com'||!url.pathname.startsWith(`/episodes/${match.id}/`))return {document:null,reason:'invalid-provider-url'};
 const titleMatches=providerEpisodes.filter(item=>normalize(item.name).length>=5&&normalize(episode.title).includes(normalize(item.name)));
 const method=canonical?'canonical-title':titleMatches.length===1?'unique-title':titleMatches.length>1?'title-and-number':'titleless-number';
 const record={showId:show.id,episodeId:episode.id,sourceId:source.id,catalogRevision,showTitle:show.title,episodeTitle:episode.title,season:episode.season,number:episode.number,summary,text:`${show.title} — ${episode.title}\n${summary}`,provider:'TVmaze',sourceUrl:url.href,license:'CC BY-SA',match:{method,providerShowId,providerEpisodeId:match.id,providerEpisodeTitle:match.name,providerSeason:match.season,providerNumber:match.number}};
 return {document:{evidenceId:createHash('sha256').update(JSON.stringify(record)).digest('hex'),...record,fetchedAt},reason:null};
}

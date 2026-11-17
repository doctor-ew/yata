import{normalizeBuddyReply}from'./buddy-reply.mjs';
import{stationSource}from'./domain.mjs';
const text=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max?value.trim():null;
export function isEpisodeStoryQuestion(question){
 if(typeof question!=='string'||!question.trim()||question.length>300)return false;
 return /\b(?:which|what|find|search|remember|looking for|tell me about)\b/i.test(question)&&/\b(?:episode|story|plot|happens|happened|involves|about the|character|scene|quote)\b/i.test(question);
}
export function normalizeBuddyConversation(value){
 const answer=typeof value==='string'?value:value?.answer;
 if(typeof answer!=='string'||!answer.trim()||answer.length>12000)throw Error('Your buddy sent an unreadable reply. Try again.');
 const evidence=[],retrieval=value?.retrieval,status=['ok','unsupported-scope','unavailable'].includes(retrieval?.status)?retrieval.status:null;
 for(const item of status==='ok'&&Array.isArray(retrieval?.results)?retrieval.results.slice(0,3):[]){
  if(!item||!text(item.showId,160)||!text(item.episodeId,160)||!text(item.sourceId,160)||!text(item.showTitle,300)||!text(item.episodeTitle,500))continue;
  let url;try{url=new URL(item.sourceUrl);}catch{continue;}
  if(url.protocol!=='https:'||url.hostname!=='www.tvmaze.com'||url.port||url.username||url.password||url.search||url.hash||!/^\/episodes\/[1-9]\d*\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname))continue;
  if(item.provider!=='TVmaze'||item.evidenceType!=='episode-summary'||item.spoilerScope!=='whole-episode'||item.license!=='CC BY-SA'||!/^[a-f0-9]{64}$/.test(item.evidenceId||''))continue;
  const record={showId:item.showId,episodeId:item.episodeId,sourceId:item.sourceId,showTitle:item.showTitle,episodeTitle:item.episodeTitle,sourceUrl:url.href,provider:'TVmaze',evidenceId:item.evidenceId,evidenceType:'episode-summary',spoilerScope:'whole-episode',license:'CC BY-SA'};
  if(!evidence.some(e=>e.showId===record.showId&&e.episodeId===record.episodeId&&e.sourceId===record.sourceId))evidence.push(record);
 }
 return {answer:normalizeBuddyReply(answer),...(status?{retrieval:{status,notice:text(retrieval.notice,1000)||'',results:evidence}}:{})};
}
export function catalogBuddyEvidence(value,catalog){
 return (normalizeBuddyConversation(value).retrieval?.results||[]).flatMap(item=>{
  const show=catalog?.shows?.find(s=>s.id===item.showId),episode=show?.episodes?.find(e=>e.id===item.episodeId),source=episode?.sources?.find(s=>s.id===item.sourceId);
  if(!show||!episode||episode.kind!=='episode'||!source||stationSource({...episode,sources:[source]})!==source)return [];
  return [{...item,showTitle:show.title,episodeTitle:episode.title}];
 });
}

import{queueEpisode,resolveEpisodeQueue}from'./episode-queue.mjs';
import{tuneCustomChannel}from'./custom-channel.mjs';
export function prepareBuddyQueue(catalog,showId,{position='end',active=null}={}){
 const show=catalog.shows.find(s=>s.id===showId);if(!show)throw Error('That show is not in the checked catalog.');
 const queued=new Set((catalog.settings.customQueue||[]).map(r=>r.episodeId));
 const candidates=show.episodes.filter(e=>e.id!==active?.episodeId&&!queued.has(e.id)).slice().sort((a,b)=>a.season-b.season||a.number-b.number);
 let entry;for(const episode of candidates){const refs=episode.sources.map(source=>({showId:show.id,episodeId:episode.id,sourceId:source.id}));entry=resolveEpisodeQueue({...catalog,settings:{customQueue:refs}})[0];if(entry)break;}
 if(!entry)throw Error('No additional checked episodes are available for this show. It may already be queued.');
 let next=catalog,followCurrent=false;
 if(position==='next'&&active){const current=resolveEpisodeQueue({...catalog,settings:{customQueue:[{showId:active.showId,episodeId:active.episodeId,sourceId:active.sourceId}]}})[0];if(current){next=queueEpisode(next,current,{position:'next'});followCurrent=true;}}
 next=queueEpisode(next,entry,{position,afterEpisodeId:followCurrent?active.episodeId:null});
 if(followCurrent)next=tuneCustomChannel(next);
 return{catalog:next,entry,followCurrent};
}

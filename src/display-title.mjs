// Presentation only: retain the untouched source title in expandable details.
export function displayEpisodeTitle(episode,show){
 const original=String(episode.title||'').trim();
 if(/intact multi-episode compilation/i.test(original))return 'Multi-episode compilation';
 const escaped=String(show.title||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 let title=original.replace(new RegExp('^'+escaped+'[\\s:–—-]*','i'),'').replace(/^(?:S\d{1,2}\s*E\d{1,3}|\d{1,2}x\d{1,3})[\s:–—._-]*/i,'').replace(/\.(mp4|mkv|avi)$/i,'').replace(/[._]/g,' ').replace(/\s+/g,' ').trim();
 return title||original;
}

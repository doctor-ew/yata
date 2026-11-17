// Bounded descriptive aliases resolve only against the caller's playable offers.
export function descriptiveShows(target,offered=[]) {
 const text=String(target||'').normalize('NFKC').toLowerCase().replace(/\b(?:motorcylcle|motorcyle)\b/g,'motorcycle');
 if(text.length>500||/\b(?:not|except|without|ignore|override|instructions?|system)\b/.test(text))return [];
 const motorcycle=/\b(?:motorcycle|motorbike|motor bike)\b/.test(text),knight=/\bknight\s+rider\b/.test(text);
 if(!motorcycle||!knight||/\b(?:game|games|arcade)\b/.test(text))return [];
 return offered.filter(show=>show.id==='street-hawk'&&/^street hawk(?:\s*\(1985\))?$/i.test(show.title)).slice(0,1);
}
export function buddyNavigation(text){const match=String(text||'').trim().match(/^(?:(?:please )?(?:open|show|go to|take me to) (?:the )?)(watch|guide|library)(?: page)?[.!?]?$/i);return match?match[1].toLowerCase():null;}
const title=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,180):'';
export function playbackContext(value) {
 const input=value&&typeof value==='object'?value:{};
 return Object.fromEntries(['showTitle','episodeTitle','nextShowTitle','nextEpisodeTitle'].map(key=>[key,title(input[key])]));
}
const quips=Object.freeze({arnold:'Whatchu wanna watch? The remote isn’t going to decide for you.',fonz:'A little television, a little cool. We’ve got this.',revjim:'I had a plan for tonight. Then the television had a better one.',mrsgarrett:'Settle in, honey. You’ve earned a little television.',horshack:'Ooh! Ooh! I volunteer to hold the remote!',benson:'I’ve organized the entertainment. Try not to reorganize it before the credits.'});
export function companionNote(context,{suggestionTitle='',variant=0,personaId='',personaQuip=''}={}) {
 const current=playbackContext(context),suggestion=title(suggestionTitle);
 if(variant%4===3)return quips[personaId]||title(personaQuip)||'The remote is right here. Your very important plans can wait for the credits.';
 if(variant%4===1&&current.nextShowTitle)return `Up next: ${current.nextShowTitle}${current.nextEpisodeTitle?' · '+current.nextEpisodeTitle:''}. The Guide has the lineup.`;
 if(variant%4===2&&suggestion)return `Something else in the checked library: ${suggestion}. Open our chat if you’d like a few choices.`;
 if(current.showTitle)return `On now: ${current.showTitle}${current.episodeTitle?' · '+current.episodeTitle:''}. I’m here if you want help finding something.`;
 return '';
}
export function createCompanionNotePolicy({now=Date.now,initialDelay=45000,cooldown=300000}={}) {
 let next=now()+initialDelay,variant=0;
 return {next({enabled=true,visible=true,panelOpen=false,context,suggestionTitle,personaId,personaQuip}={}) {
  const time=now();if(!enabled||!visible||panelOpen||time<next)return '';
  const text=companionNote(context,{suggestionTitle,variant,personaId,personaQuip});if(!text)return '';
  variant++;next=time+cooldown;return text;
 },dismiss(){next=Math.max(next,now()+cooldown);}};
}

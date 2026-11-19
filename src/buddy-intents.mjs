export function isKonamiMessage(text){
 const normalized=String(text).normalize('NFKC').toLowerCase();
 if(/(?:^|[^a-z])(?:uuddlrlrba|upupdowndownleftrightleftrightba)(?:start)?(?:$|[^a-z])/.test(normalized))return true;
 const words=normalized.replace(/arrow\s*/g,'').replace(/[↑⬆]/g,' up ').replace(/[↓⬇]/g,' down ').replace(/[←⬅]/g,' left ').replace(/[→➡]/g,' right ').replace(/🅱️?/g,' b ').replace(/🅰️?/g,' a ').replace(/\bba\b/g,' b a ').replace(/\b(?:then|and)\b/g,' ').replace(/[^a-z]+/g,' ').trim().split(/\s+/);
 const code=['up','up','down','down','left','right','left','right','b','a'];
 return words.some((_,i)=>code.every((key,j)=>words[i+j]===key)&&(!words[i+10]||words[i+10]==='start'||!['up','down','left','right','a','b'].includes(words[i+10])));
}
export function feedbackIntent(text){const t=String(text).toLowerCase();if(/\b(report|file|found|there(?:’|'| i)?s)\b.{0,35}\b(bug|problem|issue)\b|\b(broken|not working|doesn.t work|keeps crashing)\b/.test(t))return'bug';if(/\b(request|suggest|add|missing)\b.{0,50}\b(show|content|episode|cartoon|game)\b/.test(t))return'content';if(/\b(request|suggest|add|missing)\b.{0,50}\b(channel|stream)\b/.test(t))return'channel';if(/\b(feature request|suggestion|request a feature|send feedback|tell drew|feedback)\b/.test(t))return'feature';return null;}
export function asksForForm(text){return /\b(form|human|frustrat\w*|give up|this is annoying|stop asking)\b/i.test(text);}
export function watchRequest(text){const input=safeCommand(text);if(!input)return null;const m=input.match(/^(?:please\s+)?(?:i(?:\s+(?:want|wanna|would like)|['’]d like)\s+(?:to\s+)?(?:watch|see)|let['’]s\s+watch|(?:can|could)\s+(?:i|we)\s+watch|put\s+on|play|watch)\s+(.+?)[.!?]*$/i);if(!m)return null;const target=m[1].replace(/\s+please[.!?]*$/i,'').trim();return target&&target.length<=500?target:null;}
const normalizedTitle=text=>String(text).toLowerCase().replace(/&/g,' and ').replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').replace(/^the\s+/,'').trim();
export function watchShows(target,offered){const request=' '+normalizedTitle(target)+' ',candidates=offered.map(show=>{const full=normalizedTitle(show.title),root=normalizedTitle(show.title.split(/[:(]/)[0]);return{show,root,exact:full.length>=3&&request.includes(' '+full+' '),partial:root.length>=4&&request.includes(' '+root+' ')};});const exactRoots=new Set(candidates.filter(c=>c.exact).map(c=>c.root));return candidates.filter(c=>c.exact||c.partial&&!exactRoots.has(c.root)).map(c=>c.show).slice(0,12);}
const safeCommand=text=>{const s=String(text).normalize('NFKC').trim();return /\b(?:ignore|drop|forget|override|disregard)\b.{0,60}\b(?:instructions?|instrux|rules?|system|developer|previous)\b/i.test(s)?null:s.replace(/[.!?]+$/,'').replace(/^(?:(?:can|could|would) (?:you|we) |please\s+)/i,'').replace(/^please\s+/i,'').replace(/\s+please$/i,'').trim();};
export function buddyCommand(text,personas){const s=safeCommand(text);if(!s)return null;if(/^(?:unpin(?: (?:you|my buddy|this buddy|the buddy))?|(?:randomize|shuffle)(?: (?:my )?buddy)?|surprise me(?: (?:on )?(?:each|every) launch)?)$/i.test(s))return{action:'random'};if(/^(?:pin|keep|stick with) (?:you|this|this buddy|my buddy|the current buddy)(?: (?:as my buddy|on each launch))?$/i.test(s)||/^pin (?:my |the )?buddy$/i.test(s))return{action:'pin'};const m=s.match(/^(?:turn into|change into|become|be|switch(?: (?:my )?(?:buddy|bot))? to|change (?:my )?(?:buddy|bot) to|(?:pin|keep|choose|select))\s+(.+?)(?:\s+as my buddy)?(?:\s+and pin(?: (?:it|you|that buddy))?)?$/i);if(!m)return null;const key=normalizedTitle(m[1]);const p=personas.find(p=>[p.id,p.name,...(p.aliases||[])].some(name=>normalizedTitle(name)===key));return p?{action:'select',id:p.id}:{action:'unknown',name:m[1]};}
export function queueRequest(text){const s=safeCommand(text);if(!s)return null;let m=s.match(/^(?:play|watch|put on)\s+(.+?)\s+next$/i)||s.match(/^(?:play|watch)\s+next\s*:\s*(.+)$/i);if(m)return{target:m[1].trim(),position:'next'};m=s.match(/^(?:add|queue)\s+(.+?)\s+(?:to (?:the |my )?(?:end of (?:the |my )?)?queue|at the end)$/i);if(m)return{target:m[1].trim(),position:'end'};m=s.match(/^queue\s+(.+)$/i);return m?{target:m[1].trim(),position:'end'}:null;}

// Only literal title/list requests take the instant local playback path.
// Descriptive requests go to the verified AI planner with the current catalog.
export function directWatchShows(target,offered){
 const matches=watchShows(target,offered);if(!matches.length)return [];
 let remaining=' '+normalizedTitle(target)+' ';
 const names=[...new Set(matches.flatMap(s=>[normalizedTitle(s.title),normalizedTitle(s.title.split(/[:(]/)[0])]))].sort((a,b)=>b.length-a.length);
 for(const name of names)remaining=remaining.replaceAll(' '+name+' ',' ');
 remaining=remaining.replace(/\b(?:and|or|the|a|an|some|episodes?|of|please|now|today|tonight)\b/g,'').trim();
 return remaining?[]:matches;
}

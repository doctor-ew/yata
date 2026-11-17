export function isKonamiMessage(text){
 const normalized=String(text).normalize('NFKC').toLowerCase();
 if(/(?:^|[^a-z])(?:uuddlrlrba|upupdowndownleftrightleftrightba)(?:start)?(?:$|[^a-z])/.test(normalized))return true;
 const words=normalized.replace(/arrow\s*/g,'').replace(/[↑⬆]/g,' up ').replace(/[↓⬇]/g,' down ').replace(/[←⬅]/g,' left ').replace(/[→➡]/g,' right ').replace(/🅱️?/g,' b ').replace(/🅰️?/g,' a ').replace(/\bba\b/g,' b a ').replace(/\b(?:then|and)\b/g,' ').replace(/[^a-z]+/g,' ').trim().split(/\s+/);
 const code=['up','up','down','down','left','right','left','right','b','a'];
 return words.some((_,i)=>code.every((key,j)=>words[i+j]===key)&&(!words[i+10]||words[i+10]==='start'||!['up','down','left','right','a','b'].includes(words[i+10])));
}
export function feedbackIntent(text){const t=String(text).toLowerCase();if(/\b(report|file|found|there(?:’|'| i)?s)\b.{0,35}\b(bug|problem|issue)\b|\b(broken|not working|doesn.t work|keeps crashing)\b/.test(t))return'bug';if(/\b(request|suggest|add|missing)\b.{0,50}\b(show|content|episode|cartoon)\b/.test(t))return'content';if(/\b(request|suggest|add|missing)\b.{0,50}\b(channel|stream)\b/.test(t))return'channel';if(/\b(feature request|suggestion|request a feature|send feedback|tell drew|feedback)\b/.test(t))return'feature';return null;}
export function asksForForm(text){return /\b(form|human|frustrat\w*|give up|this is annoying|stop asking)\b/i.test(text);}

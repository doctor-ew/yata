// Only explicit part labels establish a multi-part story; no title guessing.
export function serialStoryGroup(showId,season,title){
 const part=title.match(/(?:\bPart[ ._-]*\d+|\(\d+\))\s*$/i);if(!part)return '';
 const stem=title.slice(0,part.index).replace(/S\d+[ ._-]*E\d+|\d+x\d+/i,'').replace(/\s+/g,' ').trim();
 return stem?`${showId}:${season}:${stem}`.slice(0,200):'';
}

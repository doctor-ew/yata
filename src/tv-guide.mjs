import {CHANNELS} from './channels.mjs';
import {buildSchedule, schedulePosition} from './domain.mjs';

export const GUIDE_SPAN_SECONDS = 7200;
export const GUIDE_TICK_SECONDS = 1800;

// Each row is the actual full-channel station scope, independent of a tuned show.
// Cache this compilation until the catalog/settings change, not on every clock tick.
export function compileGuide(catalog) {
  const fullChannels = {...catalog, settings:{...catalog.settings, streamShow:null,streamShows:null}};
  return CHANNELS.map(channel=>({channel, schedule:buildSchedule(fullChannels,channel.id)}));
}

export function guideWindow(row, epoch, start, end, limit=512) {
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new RangeError('Choose a finite increasing guide window.');
  const position=schedulePosition(row.schedule,epoch,start);
  if (!position) return {slots:[],truncated:false};
  let index=position.index, cursor=start-position.offset, visited=0;
  // A window can begin halfway through a break: retain its first clip as the
  // playback anchor rather than silently calling the second clip the beginning.
  if(row.schedule[index].episode.kind==='bumper') {
    for(let count=0;count<row.schedule.length-1;count++) {
      const previous=(index-1+row.schedule.length)%row.schedule.length;
      if(row.schedule[previous].episode.kind!=='bumper')break;
      cursor-=row.schedule[previous].duration;index=previous;
    }
  }
  const slots=[];
  while(cursor<end && visited++<limit) {
    const entry=row.schedule[index], finish=cursor+entry.duration;
    if (!Number.isFinite(finish)||finish<=cursor) break;
    const previous=slots.at(-1);
    if(entry.episode.kind==='bumper' && previous?.entry.episode.kind==='bumper') {
      previous.end=finish;previous.breakCount++;previous.visibleEnd=Math.min(end,finish);
    } else slots.push({key:`${row.channel.id}:${index}:${cursor}`,channel:row.channel,index,entry,start:cursor,end:finish,visibleStart:Math.max(start,cursor),visibleEnd:Math.min(end,finish),breakCount:entry.episode.kind==='bumper'?1:0});
    cursor=finish;index=(index+1)%row.schedule.length;
  }
  return {slots,truncated:cursor<end};
}

export function guidePlayback(catalog, selection) {
  const channel=CHANNELS.find(channel=>channel.id===selection.channel.id);
  if(!channel)return null;
  const row={channel,schedule:buildSchedule({...catalog,settings:{...catalog.settings,streamShow:null,streamShows:null}},channel.id)};
  const matches=entry=>entry?.show.id===selection.entry.show.id && entry.episode.id===selection.entry.episode.id && entry.source.url===selection.entry.source.url;
  const index=matches(row.schedule[selection.index])?selection.index:row.schedule.findIndex(matches);
  return index<0?null:{...row.schedule[index],index,schedule:row.schedule};
}

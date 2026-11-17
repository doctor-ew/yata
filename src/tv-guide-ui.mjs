import{hasEpisodeQueue}from'./episode-queue.mjs';
import {compileGuide,guideWindow,GUIDE_SPAN_SECONDS,GUIDE_TICK_SECONDS} from './tv-guide.mjs';
import {timeLabel} from './domain.mjs';

export function mountTvGuide({root,getCatalog,isReady,onTune,onPlay,onQueue,getQueuePosition=()=>null,now=()=>Date.now()/1000}) {
  const $=name=>root.querySelector(`[data-guide-${name}]`);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
  const clock=seconds=>new Date(seconds*1000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  let cachedCatalog=null,rows=[],queueTick=null,windowStart=null,offset=0,selection=null,slots=[],slotsByKey=new Map(),busy=false,renderedStart=null;
  let menu=null,menuSelection=null,hoverTimer,lastTip=0;
  if(onQueue){menu=make('dialog',null,'guide-queue-menu');menu.setAttribute('aria-label','Episode actions');const heading=make('strong','Episode actions');menu.append(heading);for(const[label,kind]of[['Play now','play'],['Play next on 00','next'],['Add to end of 00','end']]){const b=make('button',label,'button');b.type='button';b.onclick=()=>{const slot=menuSelection;menu.close();if(!slot)return;if(kind==='play'){choose(slot);void action('play');}else void queueAction(slot,kind);};menu.append(b);}const close=make('button','Cancel','button');close.type='button';close.onclick=()=>menu.close();menu.append(close);menu.addEventListener('click',e=>{if(e.target===menu){const r=menu.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)menu.close();}});root.ownerDocument.body.append(menu);}
  function openOptions(slot,cell){if(!menu||slot.breakCount)return;menuSelection=slot;choose(slot);if(menu.open)menu.close();menu.showModal();const box=cell.getBoundingClientRect(),width=menu.getBoundingClientRect().width,height=menu.getBoundingClientRect().height;menu.style.left=`${Math.max(12,Math.min(innerWidth-width-12,box.left))}px`;menu.style.top=`${Math.max(12,Math.min(innerHeight-height-12,box.bottom))}px`;}
  async function queueAction(slot,position){try{const ok=await onQueue(slot,position);$('status').textContent=ok===false?'That episode could not be queued. Refresh the guide and try again.':position==='next'?'Saved to play next on channel 00.':'Added to the end of channel 00.';render();}catch{$('status').textContent='The queue could not be saved. Try again.';}}
  if(onQueue){for(const[label,position]of[['Play next on 00','next'],['Add to end of 00','end']]){const b=make('button',label,'button guide-queue-action');b.type='button';b.onclick=()=>{if(selection&&!selection.breakCount)void queueAction(selection,position);};$('play').parentElement.append(b);}}
  const choose=slot=>{
    selection=slot;
    root.querySelectorAll('.tv-guide-program').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.key===slot.key)));
    detail();
  };
  function liveSlot(channelId) {
    const row=rows.find(row=>row.channel.id===channelId), current=now();
    return row?guideWindow(row,getCatalog().epoch,current,current+1).slots[0]:null;
  }
  const liveTitle=slot=>slot.breakCount?'Vintage commercial break':`${slot.entry.show.title} — ${slot.entry.episode.title}`;
  function detail() {
    const valid=!!selection && isReady();
    $('tune').disabled=$('play').disabled=!valid||busy;
    $('details').hidden=!valid;root.querySelectorAll('.guide-queue-action').forEach(b=>b.disabled=!valid||!!selection?.breakCount||busy);
    if(!valid)return;
    const {channel,entry,start,end,breakCount}=selection;
    $('channel').textContent=`CH ${channel.number} / ${channel.name}`;
    $('show').textContent=breakCount?'Vintage commercial break':entry.show.title;
    $('episode').textContent=breakCount?`${breakCount} ${breakCount===1?'clip':'clips'} · ${timeLabel(end-start)}`:entry.episode.title;
    const state=start<=now()&&now()<end?'On now':start>now()?'Coming up':'Earlier';
    $('time').textContent=`${state} · ${clock(start)}–${clock(end)} · ${entry.source.provider==='archive'?'Internet Archive':'YouTube'}`;
    const live=liveSlot(channel.id);
    $('tune').disabled=!live||busy;
    $('tune').textContent=live?`▶ Join live: ${liveTitle(live)}`:'Live channel unavailable';
    $('live-note').textContent=live&&live.key!==selection.key
      ?'Joins what is playing now. To watch the selected program, start it from the beginning.'
      :'Joins this channel at its current live position.';
    $('play').textContent=breakCount?'Start break from beginning':'Start episode from beginning';
  }
  function render() {
    if(root.hidden)return;
    const catalog=getCatalog(),current=now();
    $('clock').textContent=`Now · ${clock(current)}`;
    if(!isReady()){$('rows').replaceChildren(make('p','The guide will appear after the shared catalog loads.','tv-guide-empty'));$('details').hidden=true;return;}
    const start=Math.floor(current/GUIDE_TICK_SECONDS)*GUIDE_TICK_SECONDS+offset*GUIDE_SPAN_SECONDS;
    const queueRefresh=hasEpisodeQueue(catalog)&&queueTick!==Math.floor(current/15);
    if(cachedCatalog!==catalog || renderedStart!==start || queueRefresh) {
      queueTick=Math.floor(current/15);
      if(cachedCatalog!==catalog){rows=compileGuide(catalog);cachedCatalog=catalog;}
      if(hasEpisodeQueue(catalog)){const row=rows.find(r=>r.channel.id==='custom'),cursor=getQueuePosition();if(row){let index=row.schedule.findIndex(e=>e.episode.id===cursor?.episodeId);if(index<0)index=0;row.epoch=current-row.schedule.slice(0,index).reduce((n,e)=>n+e.duration,0)-(cursor?.seconds||0);}}
      renderedStart=start;windowStart=start;
      const end=start+GUIDE_SPAN_SECONDS,previous=selection?.key;
      $('date').textContent=new Date(start*1000).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});
      $('ticks').replaceChildren(...Array.from({length:4},(_,i)=>make('span',clock(start+i*GUIDE_TICK_SECONDS))));
      const nodes=[];slots=[];
      for(const row of rows) {
        const line=make('div',null,'tv-guide-row'),channel=make('button',null,'tv-guide-channel');channel.type='button';
        channel.append(make('small',`CH ${row.channel.number}`),make('strong',row.channel.name));
        channel.setAttribute('aria-label',`Preview ${row.channel.name} on the guide`);
        const programs=make('div',null,'tv-guide-programs');
        const window=guideWindow(row,catalog.epoch,start,end);
        channel.disabled=!window.slots.length;
        channel.addEventListener('click',()=>{const slot=window.slots.find(s=>s.start<=current&&s.end>current)||window.slots[0];if(slot)choose(slot);});
        if(!window.slots.length)programs.append(make('p','No checked, schedulable episodes yet. Browse Library for sources and wishlist shows.','tv-guide-empty'));
        for(const slot of window.slots) {
          slots.push(slot);
          const cell=make('button',null,'tv-guide-program');cell.type='button';cell.dataset.key=slot.key;
          cell.style.left=`${(slot.visibleStart-start)/GUIDE_SPAN_SECONDS*100}%`;cell.style.width=`${(slot.visibleEnd-slot.visibleStart)/GUIDE_SPAN_SECONDS*100}%`;
          const title=slot.breakCount?'Commercial break':slot.entry.show.title;
          const episode=slot.breakCount?`${slot.breakCount} ${slot.breakCount===1?'clip':'clips'}`:slot.entry.episode.title;
          cell.append(make('strong',title),make('span',episode),make('small',`${clock(slot.start)}–${clock(slot.end)}`));
          cell.setAttribute('aria-label',`${title}: ${episode}, ${clock(slot.start)} to ${clock(slot.end)}, ${row.channel.name}`);
          cell.setAttribute('aria-pressed','false');cell.classList.toggle('commercial',!!slot.breakCount);
          cell.addEventListener('click',()=>{choose(slot);if(onQueue)openOptions(slot,cell);});if(onQueue){cell.addEventListener('contextmenu',event=>{if(slot.breakCount)return;event.preventDefault();openOptions(slot,cell);});cell.addEventListener('pointerenter',()=>{if(slot.breakCount||Date.now()-lastTip<20000)return;hoverTimer=setTimeout(()=>{lastTip=Date.now();window.dispatchEvent(new CustomEvent('yata:buddy-tip',{detail:{text:'Want that episode on your channel? Click it for Play next on 00 or Add to end of 00. I’ll keep your queue saved.'}}));},650);});cell.addEventListener('pointerleave',()=>clearTimeout(hoverTimer));}programs.append(cell);
        }
        if(window.truncated){const note=make('span','More short items…','tv-guide-truncated');note.title='This row has too many very short items to display in one window.';programs.append(note);}
        line.append(channel,programs);nodes.push(line);
      }
      slotsByKey=new Map(slots.map(slot=>[slot.key,slot]));
      $('rows').replaceChildren(...nodes);
      const preferred=slots.find(slot=>slot.key===previous)||slots.find(slot=>slot.channel.id===catalog.settings.channel&&slot.start<=current&&slot.end>current)||slots.find(slot=>slot.start<=current&&slot.end>current)||slots[0];
      if(preferred)choose(preferred);else {selection=null;detail();}
    }
    const percent=(current-windowStart)/GUIDE_SPAN_SECONDS*100;
    $('now').hidden=percent<0||percent>100;$('now').style.left=`${Math.max(0,Math.min(100,percent))}%`;
    root.querySelectorAll('.tv-guide-program').forEach(button=>{const slot=slotsByKey.get(button.dataset.key);button.classList.toggle('on-now',!!slot&&slot.start<=current&&slot.end>current);});
    $('earlier').disabled=offset<=-12;$('later').disabled=offset>=12;
    detail();
  }
  for(const [name,delta]of[['earlier',-1],['later',1],['reset',0]])$(name).addEventListener('click',()=>{offset=delta===0?0:offset+delta;render();});
  async function action(kind){if(!selection||busy||!isReady())return;busy=true;detail();const chosen=kind==='tune'?liveSlot(selection.channel.id):selection;try{if(!chosen)return;const result=await (kind==='tune'?onTune(chosen):onPlay(chosen));$('status').textContent=result===false?'The selection changed or could not be played. Select a current program and try again.':kind==='tune'?`Tuned live to ${chosen.channel.name}: ${liveTitle(chosen)}.`:`Playing ${chosen.entry.episode.title} from the beginning.`;}catch{$('status').textContent='Playback could not start. Please try again.';}finally{busy=false;render();}}
  $('tune').addEventListener('click',()=>action('tune'));$('play').addEventListener('click',()=>action('play'));
  return {render};
}

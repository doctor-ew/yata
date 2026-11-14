import {compileGuide,guideWindow,GUIDE_SPAN_SECONDS,GUIDE_TICK_SECONDS} from './tv-guide.mjs';
import {timeLabel} from './domain.mjs';

export function mountTvGuide({root,getCatalog,isReady,onTune,onPlay,now=()=>Date.now()/1000}) {
  const $=name=>root.querySelector(`[data-guide-${name}]`);
  const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
  const clock=seconds=>new Date(seconds*1000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  let cachedCatalog=null,rows=[],windowStart=null,offset=0,selection=null,slots=[],slotsByKey=new Map(),busy=false,renderedStart=null;
  const choose=slot=>{
    selection=slot;
    root.querySelectorAll('.tv-guide-program').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.key===slot.key)));
    detail();
  };
  function detail() {
    const valid=!!selection && isReady();
    $('tune').disabled=$('play').disabled=!valid||busy;
    $('details').hidden=!valid;
    if(!valid)return;
    const {channel,entry,start,end,breakCount}=selection;
    $('channel').textContent=`CH ${channel.number} / ${channel.name}`;
    $('show').textContent=breakCount?'Vintage commercial break':entry.show.title;
    $('episode').textContent=breakCount?`${breakCount} ${breakCount===1?'clip':'clips'} · ${timeLabel(end-start)}`:entry.episode.title;
    const state=start<=now()&&now()<end?'On now':start>now()?'Coming up':'Earlier';
    $('time').textContent=`${state} · ${clock(start)}–${clock(end)} · ${entry.source.provider==='archive'?'Internet Archive':'YouTube'}`;
    $('play').textContent=breakCount?'Start break from beginning':'Start episode from beginning';
  }
  function render() {
    if(root.hidden)return;
    const catalog=getCatalog(),current=now();
    $('clock').textContent=`Now · ${clock(current)}`;
    if(!isReady()){$('rows').replaceChildren(make('p','The guide will appear after the shared catalog loads.','tv-guide-empty'));$('details').hidden=true;return;}
    const start=Math.floor(current/GUIDE_TICK_SECONDS)*GUIDE_TICK_SECONDS+offset*GUIDE_SPAN_SECONDS;
    if(cachedCatalog!==catalog || renderedStart!==start) {
      if(cachedCatalog!==catalog){rows=compileGuide(catalog);cachedCatalog=catalog;}
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
          cell.addEventListener('click',()=>choose(slot));programs.append(cell);
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
  async function action(kind){if(!selection||busy||!isReady())return;busy=true;detail();const chosen=selection;try{const result=await (kind==='tune'?onTune(chosen):onPlay(chosen));$('status').textContent=result===false?'The selection changed or could not be played. Select a current program and try again.':kind==='tune'?`Tuned live to ${chosen.channel.name}.`:`Playing ${chosen.entry.episode.title} from the beginning.`;}catch{$('status').textContent='Playback could not start. Please try again.';}finally{busy=false;render();}}
  $('tune').addEventListener('click',()=>action('tune'));$('play').addEventListener('click',()=>action('play'));
  return {render};
}

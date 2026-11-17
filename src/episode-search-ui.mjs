import {searchEpisodes,resolveEpisodeSearchResult} from './episode-search.mjs';
export function mountEpisodeSearch({root,getCatalog,getMetadata=()=>({}),getFilters=()=>({}),onPlay,onShow}={}) {
 if(!root)return {render(){},dispose(){}};
 const doc=root.ownerDocument,make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const label=make('label','Find an episode or story title across the library'),input=make('input');input.type='search';input.maxLength=200;input.placeholder='Episode title, story title, or show + title';input.setAttribute('aria-label','Find an episode or story title across the library');label.append(input);
 const scope=make('p','Searches catalog titles only, including titles on collections. Captions, scripts and plot descriptions are not searched.','muted');
 const count=make('p','Enter at least two characters.','muted');count.setAttribute('role','status');const list=make('div',null,'episode-search-results');root.replaceChildren(label,scope,count,list);
 let timer,disposed=false;
 function render(){
  if(disposed)return;clearTimeout(timer);const query=input.value.trim();list.replaceChildren();
  if(query.length<2){count.textContent='Enter at least two characters.';return;}
  const {results,total,invalid}=searchEpisodes(getCatalog(),{query,metadata:getMetadata(),filters:getFilters(),limit:50});
  count.textContent=invalid?'Use a shorter title search (up to 200 characters and 12 words).':total?`${total.toLocaleString()} matching catalog item${total===1?'':'s'}${total>results.length?` · showing the first ${results.length}; refine your search`:''}.`:'No matching catalog titles. Try fewer words or reset the library filters.';
  for(const result of results){
   const row=make('article',null,'episode-row');row.append(make('h3',result.episodeTitle),make('p',result.showTitle+' · '+(result.collection?'Collection / unnumbered item · may contain multiple stories':`Season ${result.season} · Episode ${result.number}`),'episode-meta'));
   const actions=make('div',null,'sources'),reference={showId:result.showId,episodeId:result.episodeId,sourceId:result.sourceId};
   if(result.playable&&onPlay){const play=make('button','▶ Play');play.type='button';play.className='button small';play.onclick=()=>{const resolved=resolveEpisodeSearchResult(getCatalog(),reference);if(!resolved){count.textContent='This item changed or is no longer checked. Search again.';return;}onPlay({...reference});};actions.append(play);}else actions.append(make('span','No checked direct playback source.','muted'));
   if(onShow){const browse=make('button','View show & sources');browse.type='button';browse.className='button small';browse.onclick=()=>{if(getCatalog()?.shows?.some(s=>s.id===result.showId))onShow(result.showId);else count.textContent='This show is no longer in the catalog.';};actions.append(browse);}
   row.append(actions);list.append(row);
  }
 }
 input.oninput=()=>{clearTimeout(timer);timer=setTimeout(render,120);};
 return {render,dispose(){disposed=true;clearTimeout(timer);input.oninput=null;root.replaceChildren();}};
}

import {stationSource} from './domain.mjs';
const compare=new Intl.Collator('en',{sensitivity:'base',numeric:true}).compare;
export function libraryTitle(title){return title.replace(/^(the|an|a)\s+/i,'').normalize('NFKD');}
export function playableEpisodes(show){return show.episodes.filter(e=>e.kind==='episode'&&e.durationSeconds>0&&stationSource(e)).length;}
export function showGenres(metadata){return [...new Set([...(metadata?.genres||[]),...(metadata?.type==='Animation'?['Animation']:[])])];}
export function browseLibrary(shows,metadata,{query='',channel='all',genre='all',decade='all',availability='all',sort='title'}={}){
 const q=query.trim().toLocaleLowerCase();return shows.filter(s=>{const m=metadata[s.id],year=m?.year,playable=playableEpisodes(s)>0;return (!q||s.title.toLocaleLowerCase().includes(q)||m?.title?.toLocaleLowerCase().includes(q))&&(channel==='all'||s.channel===channel)&&(genre==='all'||showGenres(m).includes(genre))&&(decade==='all'||(decade==='unknown'?!year:Math.floor(year/10)*10===Number(decade)))&&(availability==='all'||(availability==='playable'?playable:!playable));}).sort((a,b)=>{
  const title=compare(libraryTitle(a.title),libraryTitle(b.title));if(sort==='title-desc')return -title;
  if(sort==='oldest'||sort==='newest'){const ay=metadata[a.id]?.year,by=metadata[b.id]?.year;if(!ay||!by)return ay?-1:by?1:title;const ad=metadata[a.id]?.premiered||String(ay),bd=metadata[b.id]?.premiered||String(by);return (sort==='newest'?compare(bd,ad):compare(ad,bd))||title;}
  if(sort==='genre'){const ag=showGenres(metadata[a.id])[0]||'\uffff',bg=showGenres(metadata[b.id])[0]||'\uffff';return compare(ag,bg)||title;}return title;
 });
}

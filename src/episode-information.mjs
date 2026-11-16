// Provider metadata is matched conservatively; no generated episode synopses.
const normalized=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');
export function matchEpisode(episode, candidates, showTitle='') {
 const title=normalized(episode.title),show=normalized(showTitle.replace(/\([^)]*\)/g,''));
 const matches=candidates.filter(e=>{const name=normalized(e.name);return name.length>=5&&title.includes(name);});
 if(matches.length===1)return matches[0];
 const numbered=matches.filter(e=>e.season===episode.season&&e.number===episode.number);
 if(numbered.length===1)return numbered[0];
 // Only a genuinely title-less S/E label can fall back to numbering alone.
 const remainder=normalized(episode.title.replace(/s\d+[ ._-]*e\d+/ig,'').replace(/\.mp4$/i,'')).replace(show,'');
 if(!remainder&&episode.season>0){const exact=candidates.filter(e=>e.season===episode.season&&e.number===episode.number);if(exact.length===1)return exact[0];}
 return null;
}
export function subtitleFiles(sourceUrl, files) {
 const parsed=new URL(sourceUrl),parts=parsed.pathname.split('/');if(parsed.hostname!=='archive.org'||parts[1]!=='download')return [];
 const item=parts[2],video=decodeURIComponent(parts.slice(3).join('/')),stem=video.replace(/\.ia(?=\.mp4$)/i,'').replace(/\.[^.]+$/,'');
 return files.filter(f=>typeof f.name==='string'&&/\.(vtt|srt)$/i.test(f.name)&&(!f.private||f.private==='false')).filter(f=>{const name=f.name.replace(/\.(vtt|srt)$/i,'');return name===stem||name.startsWith(stem+'.')||name.startsWith(stem+'_');}).map(f=>({url:`https://archive.org/download/${item}/${f.name.split('/').map(encodeURIComponent).join('/')}`,format:/\.srt$/i.test(f.name)?'srt':'vtt',label:f.name.split('/').at(-1)}));
}
export function toWebVtt(text) {
 const clean=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 if(/^WEBVTT(?:\s|$)/.test(clean))return clean;
 if(!/\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(clean))throw Error('Unsupported subtitle format.');
 return 'WEBVTT\n\n'+clean.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2');
}
export function createEpisodeLookup({fetcher=globalThis.fetch}={}) {
 const shows=new Map(),items=new Map();
 async function json(url,cache){if(!cache.has(url))cache.set(url,fetcher(url,{signal:AbortSignal.timeout(12000)}).then(r=>{if(!r.ok)throw Error('Provider metadata unavailable.');return r.json();}).catch(e=>{cache.delete(url);throw e;}));return cache.get(url);}
 return {
  async summary(show,episode,art){if(!Number.isInteger(art?.tvmazeId))return null;const list=await json(`https://api.tvmaze.com/shows/${art.tvmazeId}/episodes`,shows),match=matchEpisode(episode,list,show.title);return match?.summary?{html:match.summary,url:match.url,title:match.name,airdate:match.airdate}:null;},
  async captions(source){if(source.provider!=='archive')return [];const url=new URL(source.url),id=url.pathname.split('/')[2];if(url.hostname!=='archive.org'||!id)return [];const metadata=await json(`https://archive.org/metadata/${id}`,items);return subtitleFiles(source.url,metadata.files||[]);},
 };
}

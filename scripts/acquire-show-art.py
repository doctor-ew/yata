"""Cache verified series metadata and artwork from TVmaze for the YATA library."""
import argparse,concurrent.futures,hashlib,io,json,re,threading,time,unicodedata,urllib.parse,urllib.request
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('--catalog',type=Path,required=True);p.add_argument('--cache',type=Path,required=True);args=p.parse_args()
root=Path(__file__).resolve().parent.parent;dest=root/'assets/show-art';dest.mkdir(parents=True,exist_ok=True);args.cache.mkdir(parents=True,exist_ok=True)
lock=threading.Lock();next_call=0
aliases={'star-trek-tos':'Star Trek','star-trek-tas':'Star Trek: The Animated Series','yogi-bear':'The Yogi Bear Show','heathcliff':'Heathcliff','jem':'Jem','star-wars-droids':'Droids','grimm-fairy-tale-classics':"Grimm's Fairy Tale Classics",'hulk-1982':'The Incredible Hulk','aeon-flux':'Aeon Flux','sledge-hammer':'Sledge Hammer!','kolchak':'Kolchak: The Night Stalker','dr-katz':'Dr. Katz, Professional Therapist','pete-pete':'The Adventures of Pete & Pete','gobots':'Challenge of the GoBots','captain-n':'Captain N: The Game Master','voltron':'Voltron: Defender of the Universe','transformers':'Transformers','grimm-fairy-tale-classics':'Grimm Meisaku Gekijou','flash-gordon-1979':'The New Animated Adventures of Flash Gordon','x-men-tas':'X-Men'}
skip={'midnight-matinee','vintage-commercials','saturday-simulator','adult-swim-bumps','nickelodeon-bumps','greatest-american-heroine','star-wars-holiday-special','strawberry-shortcake'}
def norm(s):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower().replace('&','and'))
def get(url,api=False):
 global next_call
 for attempt in range(4):
  if api:
   with lock:
    delay=max(0,next_call-time.monotonic());next_call=time.monotonic()+delay+.56
   if delay:time.sleep(delay)
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'YATA-library-art/1.0 (doctorew.com)','Connection':'close'})
   with urllib.request.urlopen(req,timeout=40) as response:return response.read()
  except urllib.error.HTTPError as e:
   if e.code==429 or e.code>=500:time.sleep(3*(attempt+1));continue
   raise
  except (urllib.error.URLError,TimeoutError):
   if attempt==3:raise
   time.sleep(2*(attempt+1))
 raise RuntimeError('Provider remained unavailable')
def cached(name,url):
 path=args.cache/(name+'.json')
 if path.exists():return json.loads(path.read_text())
 value=json.loads(get(url,True));path.write_text(json.dumps(value));return value
def one(show):
 sid,title=show['id'],show['title']
 if sid in skip:return sid,None,'collection/special'
 query=aliases.get(sid,re.sub(r'\s*\([^)]*\)|\s*·.*','',title)).strip();target=norm(query);m=re.search(r'\(((?:19|20)\d{2})',title);year=int(m[1]) if m else None;decade=bool(re.search(r'\(\d{4}s',title))
 results=cached(sid+'-search','https://api.tvmaze.com/search/shows?q='+urllib.parse.quote(query));candidates=[]
 for result in results:
  s=result['show'];date=s.get('premiered');y=int(date[:4]) if date else None
  if not y or not 1950<=y<=2006:continue
  animation=show['channel'] in ['cartoons','late-night']
  if animation and s.get('type')!='Animation':continue
  if show['channel'] not in ['cartoons','late-night','nick'] and s.get('type')=='Animation':continue
  name=norm(s['name']);exact=name==target;close=target in name or name in target
  match_year=(year//10==y//10 if decade else abs(year-y)<=1) if year else True
  if not match_year:continue
  candidates.append(((0 if exact else 1 if close else 2,y),s))
 candidates.sort(key=lambda x:x[0]);
 if not candidates or candidates[0][0][0]>1:return sid,None,'no confident series match'
 s=candidates[0][1];images=cached(sid+'-'+str(s['id'])+'-images',f"https://api.tvmaze.com/shows/{s['id']}/images")
 art=None;logo=None
 for kind in ['background','banner','poster',None]:
  picks=[i for i in images if i.get('type')==kind]
  if picks:
   best=sorted(picks,key=lambda i:not i.get('main',False))[0];art=best['resolutions']['original']['url'];break
 if not art:art=(s.get('image') or {}).get('original')
 logos=[i for i in images if i.get('type')=='typography']
 if logos:logo=logos[0]['resolutions']['original']['url']
 entry={'title':s['name'],'premiered':s['premiered'],'ended':s.get('ended'),'year':int(s['premiered'][:4]),'genres':s.get('genres',[]),'type':s['type'],'sourceUrl':s['url'],'tvmazeId':s['id']}
 for key,url in [('image',art),('logo',logo)]:
  if not url:continue
  output=dest/(sid+('-logo' if key=='logo' else '')+'.webp')
  try:
   if not output.exists():
    im=Image.open(io.BytesIO(get(url)));im.thumbnail((1000,700) if key=='image' else (800,320));im.save(output,'WEBP',quality=82,method=5)
   entry[key]='assets/show-art/'+output.name;entry[key+'Source']=url
  except Exception as e:entry[key+'Error']=str(e)[:100]
 return sid,entry,('matched '+s['name']+' '+s['premiered'] if norm(s['name'])!=target else '')
shows=json.loads(args.catalog.read_text())['shows'];metadata={};review=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 futures={pool.submit(one,s):s for s in shows}
 for n,f in enumerate(concurrent.futures.as_completed(futures),1):
  show=futures[f]
  try:
   sid,entry,note=f.result()
   if entry:metadata[sid]=entry
   if note:review.append({'id':sid,'catalogTitle':show['title'],'note':note})
  except Exception as e:review.append({'id':show['id'],'catalogTitle':show['title'],'error':str(e)[:200]})
  if n%25==0:print(f'{n}/{len(shows)} titles processed',flush=True)
# Retain reviewed ratings only while the matched series identity is unchanged.
previous_path=root/'data/library-art.json'
previous=json.loads(previous_path.read_text()).get('shows',{}) if previous_path.exists() else {}
for sid,entry in metadata.items():
 old=previous.get(sid,{})
 if old.get('contentRating') and entry.get('tvmazeId') and entry['tvmazeId']==old.get('tvmazeId'):
  entry['contentRating']=old['contentRating']
output={'version':1,'provider':{'name':'TVmaze','url':'https://www.tvmaze.com/api','license':'CC BY-SA'},'shows':dict(sorted(metadata.items()))}
(root/'data/library-art.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n');(args.cache/'review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2));print(json.dumps({'matched':len(metadata),'artwork':sum('image'in e for e in metadata.values()),'logos':sum('logo'in e for e in metadata.values()),'review':review}),flush=True)

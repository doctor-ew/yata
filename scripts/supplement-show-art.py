"""Reviewed original-series matches and artwork corrections; run after acquisition."""
import hashlib,io,json,re,time,urllib.request
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent;path=root/'data/library-art.json';data=json.loads(path.read_text());shows=data['shows'];folder=root/'assets/show-art'
def get(url):
 req=urllib.request.Request(url,headers={'User-Agent':'YATA-library-art/1.0 (doctorew.com)','Connection':'close'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=35) as r:return r.read()
  except Exception:
   if attempt==2:raise
   time.sleep(2)
def art(sid,url):
 image=Image.open(io.BytesIO(get(url)));image.thumbnail((1000,700));out=folder/(sid+'.webp');image.save(out,'WEBP',quality=82,method=5);return 'assets/show-art/'+out.name
# IDs are resolved against the provider search responses and reviewed for era/identity.
for sid,provider_id,year,year_source in [
 ('riptide',1497,None,None),
 ('cartoon-planet',33014,1995,'https://en.wikipedia.org/wiki/Cartoon_Planet'),
 ('star-blazers',14527,1979,'https://en.wikipedia.org/wiki/Star_Blazers'),
 ('cities-gold',18469,None,None),
]:
 s=json.loads(get(f'https://api.tvmaze.com/shows/{provider_id}'));e={'title':s['name'],'premiered':s['premiered'],'ended':s.get('ended'),'year':int(s['premiered'][:4]),'genres':s.get('genres',[]),'type':s['type'],'sourceUrl':s['url'],'tvmazeId':s['id']}
 if year:
  e['providerPremiere']=e['premiered'];e['premiered']=None;e['year']=year;e['yearSource']=year_source
  if sid=='star-blazers':e['providerEnded']=e['ended'];e['ended']=None
 url=s['image']['original'];e['image']=art(sid,url);e['imageSource']=url;shows[sid]=e;time.sleep(.6)
# The provider's background uploads for these franchise names included later films
# or unrelated promotional art. Use the reviewed original-series primary posters.
for sid in ['fall-guy','land-lost','my-little-pony','transformers','voltron','hitchhikers-guide','v','star-wars-droids','visionaries']:
 e=shows[sid];s=json.loads(get(f"https://api.tvmaze.com/shows/{e['tvmazeId']}"));url=s['image']['original'];e['image']=art(sid,url);e['imageSource']=url;time.sleep(.6)
for sid,url,year in [
 ('turkey-tv','https://en.wikipedia.org/wiki/Turkey_Television',1985),
 ('out-control','https://en.wikipedia.org/wiki/Out_of_Control_(TV_series)',1984),
]:
 try:
  html=get(url).decode();m=re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"',html)
  if not m:raise ValueError('No article artwork')
  image_url=m[1].replace('&amp;','&')
  if any(x in image_url.lower() for x in ['wikipedia-logo','wikipedia-wordmark','wikipedia-logo-v2']):raise ValueError('Default article image')
  shows[sid]={'title':sid,'premiered':None,'year':year,'genres':['Comedy'],'sourceUrl':url,'yearSource':url,'image':art(sid,image_url),'imageSource':image_url}
 except Exception as e:print(sid,'artwork unavailable:',str(e)[:100])
# Real item artwork for archived collections/specials which are not TVmaze series.
for sid,item,genres,year in [
 ('turkey-tv','turkey-television',['Comedy'],1985),
 ('vintage-commercials','youtube-yo9cFl4MNXs',['Collections'],None),
 ('adult-swim-bumps','adult-swim-first-aid-how-to-bumper-brak-heimlich-maneuver-early-2003-crown-princ',['Collections'],None),
 ('nickelodeon-bumps','nickelodeon-bumper-notepad-nick-jingle',['Collections'],None),
 ('greatest-american-heroine','the-greatest-american-heroine-pilot',['Comedy','Science-Fiction'],None),
 ('star-wars-holiday-special','the-star-wars-holiday-special',['Science-Fiction'],1978),
 ('strawberry-shortcake','strawberry-shortcake-1980s-episodes-archive',['Animation'],None),
]:
 try:
  import urllib.parse
  record=json.loads(get('https://archive.org/metadata/'+item));files=record.get('files',[])
  name=next((f['name'] for f in files if f.get('format')=='Item Image'),None) or next(f['name'] for f in files if f['name']=='__ia_thumb.jpg')
  image_url='https://archive.org/download/'+item+'/'+urllib.parse.quote(name)
  shows[sid]={'title':sid,'premiered':None,'year':year,'genres':genres,'sourceUrl':'https://archive.org/details/'+item,'image':art(sid,image_url),'imageSource':image_url}
 except Exception as error:print(sid,'archive artwork unavailable:',str(error)[:100])
manual_titles={'turkey-tv': 'Turkey Television', 'out-control': 'Out of Control', 'vintage-commercials': 'Vintage commercial breaks', 'adult-swim-bumps': 'Adult Swim · vintage bumps', 'nickelodeon-bumps': 'Nickelodeon · vintage bumps', 'greatest-american-heroine': 'The Greatest American Heroine · pilot', 'star-wars-holiday-special': 'The Star Wars Holiday Special (1978)', 'strawberry-shortcake': 'Strawberry Shortcake (1980s)'}
for sid,title in manual_titles.items():
 if sid in shows:shows[sid]['title']=title
# Opaque provider typography is a title-card image, not a transparent overlay.
for entry in shows.values():
 if entry.get('logo'):
  im=Image.open(root/entry['logo']).convert('RGBA');hist=im.getchannel('A').histogram()
  if sum(hist[:240])/sum(hist)<.05:
   entry['image']=entry.pop('logo');entry['imageSource']=entry.pop('logoSource');entry['imageRole']='title-art'
data['shows']=dict(sorted(shows.items()));path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print('Reviewed artwork entries',len(shows))

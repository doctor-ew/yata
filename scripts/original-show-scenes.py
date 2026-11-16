"""Prefer frames from the catalog's original TV episodes over modern franchise art."""
import argparse,concurrent.futures,io,json,re,urllib.parse,urllib.request,subprocess,tempfile,shutil
from pathlib import Path
from PIL import Image,ImageStat
p=argparse.ArgumentParser();p.add_argument('--catalog',type=Path,required=True);p.add_argument('--ids');p.add_argument('--seconds',type=int,default=75);args=p.parse_args();root=Path(__file__).resolve().parent.parent;catalog=json.loads(args.catalog.read_text());metadata=json.loads((root/'data/library-art.json').read_text());ids=['dinosaucers','ulysses-31','galaxy-rangers','silverhawks','mighty-orbots','voltron','transformers','my-little-pony']
if args.ids:ids=args.ids.split(',')
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'YATA-original-series-art/1.0 (doctorew.com)'}),timeout=40) as r:return r.read()
def scene(sid):
 show=next(s for s in catalog['shows'] if s['id']==sid);url=next(s['url'] for e in show['episodes'] for s in e['sources'] if s.get('availability')=='verified' and 'archive.org/download/' in s['url']);item,video=url.split('/download/')[1].split('/',1);stem=urllib.parse.unquote(video).rsplit('.',1)[0].removesuffix('.ia');record=json.loads(get('https://archive.org/metadata/'+item));frames=[]
 for f in record.get('files',[]):
  m=re.search(r'_(\d{6})\.jpe?g$',f['name'],re.I)
  if f.get('format')=='Thumbnail' and m and 15<=int(m[1])<=300:frames.append((0 if Path(f['name']).name.startswith(stem+'_') else 1,abs(int(m[1])-args.seconds),f['name']))
 for _,__,name in sorted(frames)[:8]:
  source='https://archive.org/download/'+item+'/'+urllib.parse.quote(name);im=Image.open(io.BytesIO(get(source))).convert('RGB');stats=ImageStat.Stat(im)
  if max(stats.stddev)<12 or max(stats.mean)<14:continue
  im.thumbnail((1000,700));target=root/'assets/show-art'/(sid+'.webp');im.save(target,'WEBP',quality=85);return sid,source,'https://archive.org/details/'+item
 # If the archive has no generated scene thumbnails, extract one frame only.
 if shutil.which('ffmpeg'):
  with tempfile.TemporaryDirectory(prefix='yata-scene-') as directory:
   frame=Path(directory)/'scene.png'
   try:
    result=subprocess.run(['ffmpeg','-nostdin','-loglevel','error','-ss',str(args.seconds),'-i',url,'-frames:v','1','-vf','scale=768:-1','-y',str(frame)],capture_output=True,timeout=65)
    if result.returncode==0 and frame.exists():
     im=Image.open(frame).convert('RGB');im.save(root/'assets/show-art'/(sid+'.webp'),'WEBP',quality=85);return sid,url+'#t='+str(args.seconds),'https://archive.org/details/'+item
   except subprocess.TimeoutExpired:pass
 return sid,None,None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for sid,source,credit in pool.map(scene,ids):
  if source:metadata['shows'].setdefault(sid,{'title':next(s['title'] for s in catalog['shows'] if s['id']==sid),'genres':[],'sourceUrl':credit}).update(image='assets/show-art/'+sid+'.webp',imageSource=source,imageRole='scene',imageCreditUrl=credit);print('Original episode scene:',sid)
  else:print('No usable original scene found:',sid)
(root/'data/library-art.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')

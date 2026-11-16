"""Install authorized v1.2 APK browser assets. Never installs or publishes APK files."""
import argparse, hashlib, json, shutil, zipfile
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('--source',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parent/'.local-assets'
packages={
 'starwars':'starwars-arcade-v1.2.apk','spyhunter':'spyhunter-arcade-v1.2.apk',
 'afterburner':'afterburner-arcade-v1.2.apk','doubledragon':'doubledragon-arcade-v1.2.apk',
 'knightrider':'knightrider-arcade-v1.2.apk','tofu-hunter':'tofu-hunter-v1.2.apk',
 'pizza-city':'pizza-city-v1.2.apk','amateur-surgeon':'amateur-surgeon-v1.2.apk',
 'dead-evil':'dead-evil-v1.2.apk','rick-and-morty':'rick-and-morty-v1.2.apk',
 'teddy-zombies':'teddy-zombies-v1.2.apk','nine-billion-miles':'Nine-Billion-Miles-v1.2.apk',
}
records=[]
for game,name in packages.items():
 apk=args.source/name;target=root/'ports-v12'/game
 with zipfile.ZipFile(apk) as archive:
  members=[i for i in archive.infolist() if i.filename.startswith('assets/') and not i.is_dir()]
  if sum(i.file_size for i in members)>512*1024*1024:raise ValueError('Oversized browser package')
  for item in members:
   rel=Path(item.filename).relative_to('assets')
   if '..' in rel.parts or item.external_attr>>16&0o170000==0o120000:raise ValueError('Unsafe archive member')
   dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(archive.read(item))
 records.append({'id':game,'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'source':'Authorized v1.2 browser assets; native APK code excluded'})
# Desktop adaptations of the delivered touch build. Keep the original APK intact.
p=root/'ports-v12/spyhunter/deck.js';s=p.read_text()
s=s.replace('const keyIndex={',"const extraKeys={KeyG:[[11,1],[19,32767]],KeyH:[[13,1]],KeyS:[[8,1]],KeyO:[[9,1]],KeyM:[[10,1]]};\nconst keyIndex={")
s=s.replace("e.code==='Digit5'","['Digit5','ShiftLeft'].includes(e.code)")
s=s.replace("keys.add(e.code);if(e.code.startsWith('Arrow'))","keys.add(e.code);if(extraKeys[e.code]){e.preventDefault();e.stopImmediatePropagation();source(e.code,extraKeys[e.code]);}else if(e.code.startsWith('Arrow'))")
s=s.replace("keys.delete(e.code);if(e.code.startsWith('Arrow'))","keys.delete(e.code);if(extraKeys[e.code]){e.preventDefault();e.stopImmediatePropagation();remove(e.code);}else if(e.code.startsWith('Arrow'))");p.write_text(s)
p=root/'ports-v12/spyhunter/config.js';p.write_text(p.read_text().replace('Steer with the left pad.','Steer with the left pad or arrow keys. Keyboard: 5 adds a credit, Enter starts, G is gas, H shifts gear, Space fires, S smoke, O oil, M missiles.'))
p=root/'ports-v12/doubledragon/deck.js';p.write_text(p.read_text().replace('KeyX:8,KeyC:1','KeyX:0,KeyC:8'))
shutil.copytree(args.source/'icons',root/'port-icons',dirs_exist_ok=True)
(root/'ports-v12-manifest.json').write_text(json.dumps(records,indent=2)+'\n')

portrait_css='\n/* Browser cabinet portrait layout: screen first, touch deck underneath. */\n@media(max-width:650px) and (orientation:portrait){main{grid-template-columns:112px minmax(0,1fr);grid-template-rows:minmax(150px,1fr) auto;gap:4px}#screen{grid-column:1/-1;grid-row:1}main>aside:first-of-type{grid-column:1;grid-row:2;align-items:center;gap:5px;padding:6px}#actions{grid-column:2;grid-row:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:6px}#actions button{min-height:38px;font-size:10px;padding:6px}#utility{flex-direction:row;gap:4px;width:100%}#utility button{flex:1;min-width:0;padding:6px 3px;font-size:9px}#stick{width:86px;height:86px}#launch{padding:8px}#launch>div{display:none}#launch h1{font-size:20px;margin:4px}#launch p{font-size:10px;line-height:1.3;max-height:52px;overflow:auto;margin:4px}#start{margin:4px;padding:8px;min-width:120px}#launch small{display:none}}\n'
for game in ["spyhunter","starwars","afterburner","doubledragon","knightrider"]:
 p=root/"ports-v12"/game/"deck.css";p.write_text(p.read_text()+portrait_css)

# Hold short pointer taps for three emulated frames so Start/fire cannot vanish between frames.

for game in ["spyhunter","starwars","afterburner","doubledragon","knightrider"]:
 p=root/"ports-v12"/game/"deck.js";s=p.read_text()
 s=s.replace("const b=document.createElement('button');b.textContent=label;","const b=document.createElement('button'),heldPointers=new Map();b.textContent=label;").replace("source('button-'+e.pointerId,entries);",'const hold={token:Symbol(label),released:false,settled:false};heldPointers.set(e.pointerId,hold);source(hold.token,entries);frames(3).catch(()=>{}).finally(()=>{hold.settled=true;if(hold.released)remove(hold.token);});').replace("remove('button-'+e.pointerId);",'const hold=heldPointers.get(e.pointerId);if(hold){hold.released=true;if(hold.settled)remove(hold.token);heldPointers.delete(e.pointerId);}')
 if game=="knightrider":s+="\nasync function frames(n){const start=gm().getFrameNum(),until=Date.now()+5000;while(gm().getFrameNum()-start<n){if(document.hidden||Date.now()>until)throw Error('Game suspended');await new Promise(r=>setTimeout(r,16));}}\n"
 p.write_text(s)

print(json.dumps({'installed':len(records),'nativeApksPublished':False}))

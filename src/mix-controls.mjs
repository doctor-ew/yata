export function mountMixControls({root,channels,getSettings,onChange}) {
 const choices=channels.filter(c=>c.id!=='mixed'),doc=root.ownerDocument;
 const summary=doc.createElement('summary');summary.append('YATA MIX · ');const status=doc.createElement('span');summary.append(status);
 const fieldset=doc.createElement('fieldset'),legend=doc.createElement('legend');legend.textContent='Channels in your YATA mix';fieldset.append(legend);const inputs=[];
 for(const c of choices){const label=doc.createElement('label');label.className='tv-mix-switch';const input=doc.createElement('input');input.type='checkbox';input.value=c.id;input.setAttribute('aria-label',c.name);const face=doc.createElement('span');face.className='rocker-face';face.setAttribute('aria-hidden','true');const text=doc.createElement('span');text.textContent=c.name;label.append(input,face,text);fieldset.append(label);inputs.push(input);input.addEventListener('change',()=>{
  const current=new Set(getSettings().mixChannels??choices.map(c=>c.id));if(input.checked)current.add(c.id);else current.delete(c.id);void change(choices.filter(c=>current.has(c.id)).map(c=>c.id));
 });}
 const actions=doc.createElement('div');actions.className='mix-actions';for(const [text,value]of [['All on',choices.map(c=>c.id)],['All off',[]]]){const b=doc.createElement('button');b.type='button';b.className='text-button';b.textContent=text;b.addEventListener('click',()=>void change(value));actions.append(b);}
 const help=doc.createElement('p');help.className='muted';help.textContent='These switches affect the main YATA mix. Individual channels and your assembled channel remain available.';
 root.replaceChildren(summary,fieldset,actions,help);let busy=false;
 async function change(ids){if(busy)return;busy=true;fieldset.disabled=true;for(const b of actions.children)b.disabled=true;try{await onChange(ids);}finally{busy=false;fieldset.disabled=false;for(const b of actions.children)b.disabled=false;sync();}}
 function sync(){const enabled=getSettings().mixChannels??choices.map(c=>c.id);for(const input of inputs)input.checked=enabled.includes(input.value);status.textContent=enabled.length===choices.length?'All channels on':enabled.length?`${enabled.length} of ${choices.length} on`:'All channels off';}
 sync();return{sync};
}

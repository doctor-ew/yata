export const BUDDY_INTENTS=Object.freeze(['conversation','build-channel','episode-search','queue-next','queue-end','launch-game','feedback','companion','clarify']);
export function normalizeBuddyIntent(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!['classified','clarify','unavailable'].includes(value.status)||!BUDDY_INTENTS.includes(value.intent)||typeof value.confidence!=='number'||!Number.isFinite(value.confidence)||value.confidence<0||value.confidence>1||Object.keys(value).some(k=>!['version','status','intent','confidence'].includes(k)))throw Error('Invalid buddy intent.');
 return value.status==='classified'&&value.confidence>=.85&&value.intent!=='clarify'?value.intent:'clarify';
}
export function companionChoices(personas,query=''){
 const key=String(query).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 return personas.filter(p=>!key||[p.name,...(p.aliases||[])].some(name=>String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(key))).slice().sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id));
}

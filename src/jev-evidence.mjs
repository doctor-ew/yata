// Development Jev experiment boundary; callers supply a fixed, reviewed evidence shortlist.
export function checkJevSelection(raw,candidates){
 if(!Array.isArray(candidates)||!candidates.length||candidates.length>250)throw Error('Invalid candidate catalog.');
 const allowed=new Map();for(const c of candidates){if(typeof c?.id!=='string'||allowed.has(c.id)||!/^([a-f0-9]{64})$/.test(c.id))throw Error('Invalid candidate identity.');allowed.set(c.id,c);}
 const probability=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
 if(!raw||!probability(raw.exists)||!Array.isArray(raw.top)||raw.top.length>candidates.length)return{status:'review',evidenceIds:[],reason:'Invalid provider result.'};
 const seen=new Set();
 for(const item of raw.top){if(!allowed.has(item?.id)||seen.has(item.id)||!probability(item.probability))return{status:'review',evidenceIds:[],reason:'Provider returned an invalid or unknown candidate.'};seen.add(item.id);}
 if(raw.exists<0.15)return{status:'unsupported',evidenceIds:[]};
 const ranking=[...raw.top].sort((a,b)=>b.probability-a.probability),first=ranking[0],runner=ranking[1]?.probability??0;
 if(raw.exists<0.85||!first||first.probability<0.85||first.probability-runner<0.5)return{status:'review',evidenceIds:[],reason:'Insufficient support or an ambiguous ranking.'};
 // Text, URLs and actions returned by the provider are deliberately ignored.
 return{status:'selected',evidenceIds:[first.id]};
}

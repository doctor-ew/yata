// The JSON file is authoritative presentation data. Bootstrap is explicit and never overwrites it.
import{readFile,writeFile}from'node:fs/promises';import{bundledBuddyFeed,validateBuddyFeed}from'../src/buddy-registry.mjs';
const file=new URL('../data/buddy-personas.json',import.meta.url);let raw;
try{raw=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT'||!process.argv.includes('--bootstrap'))throw error;raw=bundledBuddyFeed();}
const feed=validateBuddyFeed(raw);await writeFile(file,JSON.stringify(feed,null,2)+'\n');console.log({personas:feed.personas.length,arcade:feed.personas.filter(p=>p.arcade).length});

// Reclassify existing inventory only. Never replace a public catalog with a seed.
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateCatalog} from '../src/domain.mjs';
import {validateChannelRegistry,compatibilityCatalog} from '../src/channel-registry.mjs';
import {frozenCatalog} from './catalog-publisher.mjs';
export const GAME_SHOW_IDS=['match-game','password-plus','hollywood-squares','press-your-luck','price-right','pyramid-25000','pyramid-100000','wheel-fortune','jeopardy','jokers-wild','classic-concentration','family-feud','card-sharks','lets-make-deal','tattletales','blockbusters','super-password','body-language','to-tell-truth','whats-my-line'];
export function migrateChannelRegistry(input,registry){
 const original=validateCatalog(input),next=structuredClone(original);next.channelRegistry=validateChannelRegistry(registry);
 if(!next.channelRegistry.channels.some(c=>c.id==='game-shows'))throw Error('Game Shows definition is required.');
 for(const id of GAME_SHOW_IDS){const show=next.shows.find(s=>s.id===id);if(!show)throw Error(`Missing existing collection: ${id}`);if(show.channel!=='game-shows'){show.legacyChannel=show.channel;show.channel='game-shows';}}
 const valid=validateCatalog(next);
 if(!original.channelRegistry&&frozenCatalog(compatibilityCatalog(valid)).revision!==frozenCatalog(original).revision)throw Error('Legacy projection changed existing inventory.');
 return valid;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/migrate-channel-registry.mjs INPUT OUTPUT');
 const registry=JSON.parse(await readFile(new URL('../data/channel-registry.json',import.meta.url),'utf8'));
 const next=migrateChannelRegistry(JSON.parse(await readFile(input,'utf8')),registry);await writeFile(output,JSON.stringify(next)+'\n');console.log(JSON.stringify({shows:next.shows.length,channels:next.channelRegistry.channels.length,movedCollections:GAME_SHOW_IDS.length,revision:frozenCatalog(next).revision}));
}

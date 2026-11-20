import {DEFAULT_CHANNELS} from './channel-defaults.mjs';
import {validateChannelRegistry} from './channel-registry.mjs';
import { EXPANDED_ERA_SHOWS } from './expanded-era.mjs';
export const NICK_SHOW_IDS = new Set(['ycdtotv','turkey-tv','danger-mouse','count-duckula','cities-gold','double-dare','out-control','salute-shorts','hey-dude','pete-pete','nickelodeon-bumps']);
export const SERIAL_SHOW_IDS = new Set(['gargoyles','dallas','rocky-bullwinkle','st-elsewhere','hill-street-blues','nypd-blue','cagney-lacey','china-beach','northern-exposure','picket-fences']);
export const CHANNELS = DEFAULT_CHANNELS.map(channel=>({...channel}));
export const SHOW_CHANNEL_IDS = CHANNELS.filter(channel=>channel.id!=='mixed').map(channel=>channel.id);
export function applyChannelRegistry(registry){const clean=validateChannelRegistry(registry);CHANNELS.splice(0,CHANNELS.length,...clean.channels.map(({fallback,...channel})=>channel));SHOW_CHANNEL_IDS.splice(0,SHOW_CHANNEL_IDS.length,...CHANNELS.filter(c=>c.id!=='mixed').map(c=>c.id));return clean;}
export function catalogChannels(catalog){return catalog?.channelRegistry?.channels??DEFAULT_CHANNELS;}
export function mixIncludes(settings, channel) { return !Array.isArray(settings.mixChannels) || settings.mixChannels.includes(channel); }
export const SCI_FI_SHOW_IDS = new Set([
  ...EXPANDED_ERA_SHOWS.filter(show=>show.channel==='scifi').map(show=>show.id),
  'automan', 'phoenix', 'voyagers', 'buck-rogers', 'battlestar', 'v',
  'matthew-star', 'misfits-science', 'otherworld',
  'star-wars-holiday-special', 'star-trek-tos', 'star-trek-tng', 'star-trek-ds9', 'star-trek-voyager', 'star-trek-enterprise', 'quantum-leap', 'space-1999', 'ufo', 'fantastic-journey', 'logans-run', 'space-academy', 'jason-star-command',
]);

// Move only the existing curated action entries; custom shows and explicit
// cartoon classifications retain their category.
export function migratedShowChannel(showId, channel) {
  if(showId==='miami-vice'&&channel==='action')return 'drama';
  if(NICK_SHOW_IDS.has(showId)&&['cartoons','comedy'].includes(channel))return 'nick';
  return channel === 'action' && SCI_FI_SHOW_IDS.has(showId) ? 'scifi' : channel;
}

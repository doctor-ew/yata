import { EXPANDED_ERA_SHOWS } from './expanded-era.mjs';
export const NICK_SHOW_IDS = new Set(['ycdtotv','turkey-tv','danger-mouse','count-duckula','cities-gold','double-dare','out-control','salute-shorts','hey-dude','pete-pete','nickelodeon-bumps']);
export const SERIAL_SHOW_IDS = new Set(['st-elsewhere','hill-street-blues','nypd-blue','cagney-lacey','china-beach','northern-exposure','picket-fences']);
export const CHANNELS = [
  { id: 'mixed', number: '01', name: 'YATA Channels', subtitle: 'All TV channels.', accent: '#ffc66e' },
  { id: 'action', number: '02', name: 'Action Adventure', subtitle: 'Action and adventure.', accent: '#ff927b' },
  { id: 'scifi', number: '03', name: 'Sci-Fi', subtitle: 'Science-fiction series.', accent: '#79cde5' },
  { id: 'cartoons', number: '04', name: 'Saturday Morning', subtitle: 'Animated series.', accent: '#ac9aff' },
  { id: 'comedy', number: '05', name: 'Comedy', subtitle: 'Comedy series.', accent: '#f4c36e' },
  { id: 'seventies', number: '06', name: '70s Prime Time', subtitle: 'Detectives and road shows.', accent: '#d8b16d' },
  { id: 'late-night', number: '07', name: 'Late Night Toons', subtitle: 'Adult animation · 1990s–2000s.', accent: '#b2a0ce' },
  { id: 'nick', number: '08', name: 'Nickelodeon', subtitle: 'After school · classic Nick.', accent: '#df8658' },
  { id: 'drama', number: '09', name: 'Drama', subtitle: 'Hospital rounds and precinct roll calls.', accent: '#8fa9ad' },
];
export const SHOW_CHANNEL_IDS = CHANNELS.filter(channel=>channel.id!=='mixed').map(channel=>channel.id);
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

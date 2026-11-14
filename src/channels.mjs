export const CHANNELS = [
  { id: 'mixed', number: '01', name: 'YATA Channels', subtitle: 'All TV channels.', accent: '#ffc66e' },
  { id: 'action', number: '02', name: 'Action Adventure', subtitle: 'Action and adventure.', accent: '#ff927b' },
  { id: 'scifi', number: '03', name: 'Sci-Fi', subtitle: 'Science-fiction series.', accent: '#79cde5' },
  { id: 'cartoons', number: '04', name: 'Saturday Morning', subtitle: 'Animated series.', accent: '#ac9aff' },
  { id: 'comedy', number: '05', name: 'Comedy', subtitle: 'Comedy series.', accent: '#f4c36e' },
  { id: 'seventies', number: '06', name: '70s Prime Time', subtitle: 'Detectives and road shows.', accent: '#d8b16d' },
];
export const SHOW_CHANNEL_IDS = ['action', 'scifi', 'cartoons', 'comedy', 'seventies'];
export const SCI_FI_SHOW_IDS = new Set([
  'automan', 'phoenix', 'voyagers', 'buck-rogers', 'battlestar', 'v',
  'matthew-star', 'misfits-science', 'otherworld',
  'space-1999', 'ufo', 'fantastic-journey', 'logans-run', 'space-academy', 'jason-star-command',
]);

// Move only the existing curated action entries; custom shows and explicit
// cartoon classifications retain their category.
export function migratedShowChannel(showId, channel) {
  return channel === 'action' && SCI_FI_SHOW_IDS.has(showId) ? 'scifi' : channel;
}

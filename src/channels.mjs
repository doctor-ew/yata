export const CHANNELS = [
  { id: 'mixed', number: '01', name: 'YATA', subtitle: 'Everything, shuffled', accent: '#ffc66e' },
  { id: 'action', number: '02', name: 'Action Adventure', subtitle: 'Random heroes. Impossible missions.', accent: '#ff927b' },
  { id: 'scifi', number: '03', name: 'Sci-Fi', subtitle: 'Strange worlds. Retro futures.', accent: '#79cde5' },
  { id: 'cartoons', number: '04', name: 'Saturday Morning', subtitle: 'Random cartoons. Add cereal.', accent: '#ac9aff' },
  { id: 'comedy', number: '05', name: 'Comedy', subtitle: 'Familiar faces. Classic laughs.', accent: '#f4c36e' },
  { id: 'seventies', number: '06', name: '70s Prime Time', subtitle: 'Detectives, open roads, and classic cases.', accent: '#d8b16d' },
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

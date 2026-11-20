import { MOVIE_SHOW_ID } from './collections.mjs';
import { catalogChannels, mixIncludes } from './channels.mjs';
import { COMMERCIAL_SHOW_ID, parseDuration, stationSource } from './domain.mjs';

export function availableDialShows(catalog, channel = catalog.settings.channel) {
  if (!catalogChannels(catalog).some(item => item.id === channel)) throw new RangeError('Choose an available station channel.');
  return catalog.shows.filter(show => show.id !== COMMERCIAL_SHOW_ID && show.id !== MOVIE_SHOW_ID && (channel === 'mixed' || show.channel === channel) && (channel!=='mixed'||mixIncludes(catalog.settings,show.channel)) && show.episodes.some(episode => episode.kind === 'episode' && parseDuration(episode.durationSeconds) !== null && stationSource(episode)));
}

export function nextDialShow(catalog, currentShowId) {
  const shows = availableDialShows(catalog);
  if (!shows.length) return null;
  const current = shows.findIndex(show => show.id === currentShowId);
  return shows[(current + 1) % shows.length];
}

export function randomDialPatch(catalog, { mode = 'channel', seed, random = Math.random, currentShowId = null } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) throw new RangeError('Dial shuffle seed must be a 32-bit unsigned integer.');
  if (!['channel', 'all', 'show'].includes(mode)) throw new RangeError('Choose channel, all or show dial mode.');
  const channel = mode === 'all' ? 'mixed' : catalog.settings.channel;
  const shows = availableDialShows(catalog, channel);
  if (!shows.length) return null;
  let streamShow = null;
  if (mode === 'show') {
    if (typeof random !== 'function') throw new TypeError('Dial randomness must be a function.');
    const choices = shows.length > 1 ? shows.filter(show => show.id !== currentShowId) : shows;
    const sample = random();
    const bounded = typeof sample === 'number' && Number.isFinite(sample) ? Math.max(0, Math.min(1 - Number.EPSILON, sample)) : 0;
    streamShow = choices[Math.floor(bounded * choices.length)].id;
  }
  return { channel, streamShow, rotation: 'random', shuffleSeed: seed };
}

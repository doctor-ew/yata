import { MOVIE_SHOW_ID } from './collections.mjs';
import { CHANNELS, SHOW_CHANNEL_IDS, migratedShowChannel } from './channels.mjs';
import { randomRotation, createCommercialBreak } from './shuffle.mjs';
export const COMMERCIAL_SHOW_ID = 'vintage-commercials';
export const STORAGE_KEY = 'drew-tv.catalog.v1';
export const MAX_IMPORT_BYTES = 2_000_000;
const ID = /^[\w.-]{1,160}$/;
const VIDEO = /^[\w-]{11}$/;
const PLAYLIST = /^[\w-]{10,150}$/;

function fail(message) { throw new Error(message); }
function text(value, label, max = 500) {
  if (typeof value !== 'string' || value.length > max || !value.trim()) fail(`Invalid ${label}.`);
  return value.trim();
}
function id(value) {
  if (typeof value !== 'string' || !ID.test(value)) fail('Invalid catalog ID.');
  return value;
}
function httpsUrl(raw) {
  let url;
  try { url = new URL(text(raw, 'source URL', 4096)); } catch { fail('Enter a complete HTTPS source URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) fail('Sources must use HTTPS without credentials or custom ports.');
  return url;
}

export function parseSourceUrl(raw) {
  const u = httpsUrl(raw);
  if (['archive.org', 'www.archive.org'].includes(u.hostname)) {
    const match = u.pathname.match(/^\/(details|metadata|download)\/([\w.-]+)(?:\/(.+))?\/?$/);
    if (!match || match[2] === '.' || match[2] === '..') fail('Use an Internet Archive item or video-file URL.');
    if (match[1] === 'download') {
      let file;
      try { file = decodeURIComponent(match[3] || ''); } catch { fail('Invalid Archive filename.'); }
      if (!file.toLowerCase().endsWith('.mp4') || file.split('/').some(p => p === '..' || p === '.') || /[\x00-\x1f\\]/.test(file)) fail('Use a public MP4 file from Internet Archive.');
      return { provider: 'archive', kind: 'video', itemId: match[2], file,
        url: `https://archive.org/download/${match[2]}/${file.split('/').map(encodeURIComponent).join('/')}` };
    }
    if (match[3]) fail('Use the Archive item URL without a filename.');
    return { provider: 'archive', kind: 'item', itemId: match[2], url: `https://archive.org/details/${match[2]}` };
  }
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'].includes(u.hostname)) {
    let videoId = u.hostname === 'youtu.be' ? u.pathname.slice(1).split('/')[0] :
      (u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)\/?$/)?.[2]);
    const playlistId = u.searchParams.get('list');
    if (videoId && VIDEO.test(videoId)) return { provider: 'youtube', kind: 'video', videoId,
      url: `https://www.youtube.com/watch?v=${videoId}` };
    if (playlistId && PLAYLIST.test(playlistId) && ['/playlist', '/embed/videoseries', '/watch'].includes(u.pathname)) {
      return { provider: 'youtube', kind: 'playlist', playlistId, url: `https://www.youtube.com/playlist?list=${playlistId}` };
    }
    fail('Use a valid YouTube video or playlist URL.');
  }
  if (['tubitv.com', 'www.tubitv.com'].includes(u.hostname) && /^\/(tv-shows|movies|series)\/\d+(?:\/[^/]+)?\/?$/.test(u.pathname)) {
    return { provider: 'tubi', kind: 'external', url: `https://tubitv.com${u.pathname}` };
  }
  fail('Supported sources are Internet Archive, YouTube, and Tubi.');
}

export function parseDuration(value) {
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':');
    if (parts.length > 3 || parts.some(p => !/^\d+(?:\.\d+)?$/.test(p))) return null;
    value = parts.reduce((n, p) => n * 60 + Number(p), 0);
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 86400 ? n : null;
}

export function archiveEpisodes(itemId, metadata) {
  if (!metadata || !Array.isArray(metadata.files) || !metadata.metadata) fail('Archive returned incomplete item metadata.');
  if (metadata.files.some(f => !f || typeof f !== 'object' || typeof f.name !== 'string')) fail('Archive returned malformed file metadata. Your catalog has not changed.');
  const originals = new Map(metadata.files.map(f => [f.name, f]));
  const groups = new Map();
  for (const f of metadata.files) {
    if (typeof f.name !== 'string' || !/\.mp4$/i.test(f.name) || (f.private && f.private !== 'false')) continue;
    let root = f;
    const seen = new Set();
    while (typeof root.original === 'string' && originals.has(root.original) && !seen.has(root.original)) {
      seen.add(root.original); root = originals.get(root.original);
    }
    const key = (root.name || f.name).replace(/\.[^.]+$/, '').toLowerCase();
    const candidate = { f, score: (f.format === 'h.264' ? 2 : 0) + (parseDuration(f.length) ? 1 : 0) };
    if (!groups.has(key) || candidate.score > groups.get(key).score) groups.set(key, candidate);
  }
  const result = [...groups.values()].map(({ f }, index) => {
    const source = parseSourceUrl(`https://archive.org/download/${itemId}/${f.name.split('/').map(encodeURIComponent).join('/')}`);
    const order = f.name.match(/s(\d+)\s*e(\d+)/i);
    const title = typeof f.title === 'string' && f.title.trim() ? f.title : f.name.replace(/\.mp4$/i, '').replace(/_/g, ' ');
    return { id: `archive-${itemId.slice(0, 70)}-${index}`, title: title.slice(0, 500),
      season: order ? Number(order[1]) : 0, number: order ? Number(order[2]) : index + 1,
      durationSeconds: parseDuration(f.length), group: '', kind: 'episode',
      sources: [{ id: `archive-file-${index}`, provider: 'archive', url: source.url, availability: 'verified' }] };
  });
  if (!result.length) fail('No public MP4 video files were found in this Archive item.');
  return result;
}

export async function importArchive(raw, fetcher = globalThis.fetch, timeoutMs = 12000) {
  const parsed = parseSourceUrl(raw);
  if (parsed.provider !== 'archive' || parsed.kind !== 'item') fail('Enter an Internet Archive item URL to import.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`https://archive.org/metadata/${parsed.itemId}`, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) fail(`Archive metadata request failed (${response.status}). Try again or open the original item.`);
    return archiveEpisodes(parsed.itemId, await response.json());
  } catch (error) {
    if (error.name === 'AbortError') fail('Archive took too long to respond. Your catalog has not changed.');
    throw error;
  } finally { clearTimeout(timer); }
}

export function validateCatalog(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.shows) || raw.shows.length > 100 || !raw.shows.length) fail('Expected a version-1 YATA catalog with 1–100 shows.');
  if (!Number.isFinite(raw.epoch) || raw.epoch < 0) fail('Invalid station start time.');
  if (!raw.settings || !CHANNELS.some(channel => channel.id === raw.settings.channel) || typeof raw.settings.bumpers !== 'boolean') fail('Invalid station settings.');
  const rotation = raw.settings.rotation ?? 'random';
  const shuffleSeed = raw.settings.shuffleSeed ?? 1984;
  const storiesPerTurn = raw.settings.storiesPerTurn ?? 1;
  const commercialCount = raw.settings.commercialCount ?? 1;
  const streamShow = raw.settings.streamShow ?? null;
  if (!['random', 'ordered'].includes(rotation)) fail('Choose random or ordered rotation.');
  if (!Number.isInteger(shuffleSeed) || shuffleSeed < 0 || shuffleSeed > 4294967295) fail('Invalid shuffle seed.');
  if (![1, 2, 3, 'random'].includes(commercialCount)) fail('Choose 1, 2, 3 or random commercials per break.');
  if (![1, 2, 3].includes(storiesPerTurn)) fail('Choose 1, 2 or 3 stories per show turn.');
  if (streamShow !== null) id(streamShow);
  const showIds = new Set(), episodeIds = new Set();
  let count = 0;
  const shows = raw.shows.map(s => {
    const sid = id(s.id);
    if (showIds.has(sid)) fail('Duplicate show ID.');
    showIds.add(sid);
    if (!SHOW_CHANNEL_IDS.includes(s.channel) || !Array.isArray(s.episodes)) fail('Invalid show channel or episode list.');
    let imdbUrl = null;
    if (s.imdbUrl != null && s.imdbUrl !== '') {
      const u = httpsUrl(s.imdbUrl);
      if (!['imdb.com', 'www.imdb.com'].includes(u.hostname) || !/^\/title\/tt\d+\/?$/.test(u.pathname)) fail('Use an IMDb title reference URL.');
      imdbUrl = `https://www.imdb.com${u.pathname}`;
    }
    const episodes = s.episodes.map(e => {
      if (++count > 5000) fail('Catalog is limited to 5,000 episodes.');
      const eid = id(e.id);
      if (episodeIds.has(eid)) fail('Duplicate episode ID.');
      episodeIds.add(eid);
      if (!Number.isInteger(e.season) || e.season < 0 || !Number.isInteger(e.number) || e.number < 0) fail('Episode order must contain nonnegative whole numbers.');
      if (e.durationSeconds !== null && (typeof e.durationSeconds !== 'number' || parseDuration(e.durationSeconds) === null)) fail('Runtime must be positive seconds, or null when unknown.');
      if (!['episode', 'bumper'].includes(e.kind) || typeof e.group !== 'string' || e.group.length > 200 || !Array.isArray(e.sources) || e.sources.length > 20) fail('Invalid episode kind, group, or sources.');
      if (sid === COMMERCIAL_SHOW_ID && e.kind !== 'bumper') fail('The vintage commercial collection accepts bumper clips only.');
      const sourceIds = new Set();
      const sources = e.sources.map(source => {
        const sourceId = id(source.id);
        if (sourceIds.has(sourceId)) fail('Duplicate source ID.');
        sourceIds.add(sourceId);
        const p = parseSourceUrl(source.url);
        if (p.provider !== source.provider || (p.provider === 'archive' && p.kind !== 'video') || !['verified', 'unverified'].includes(source.availability)) fail('Invalid source provider or availability.');
        return { id: sourceId, provider: p.provider, url: p.url, availability: source.availability };
      });
      return { id: eid, title: text(e.title, 'episode title'), season: e.season, number: e.number,
        durationSeconds: e.durationSeconds, group: e.group.trim(), kind: e.kind, sources };
    });
    return { id: sid, title: text(s.title, 'show title'), channel: migratedShowChannel(sid, s.channel), imdbUrl, episodes };
  });
  // Preserve a legacy show-only stream when its curated show moves channels.
  const migratedStream = streamShow !== null && raw.settings.channel === 'action' && raw.shows.find(show => show.id === streamShow)?.channel === 'action' && shows.find(show => show.id === streamShow)?.channel === 'scifi';
  const channel = migratedStream ? 'scifi' : raw.settings.channel;
  if (streamShow === COMMERCIAL_SHOW_ID) fail('Choose a program show for the stream.');
  if (streamShow !== null && !shows.some(show => show.id === streamShow && (channel === 'mixed' || show.channel === channel))) fail('The selected stream show is not in this channel.');
  if (raw.publishedRevision !== undefined && !/^[a-f0-9]{64}$/.test(raw.publishedRevision)) fail('Invalid published catalog revision.');
  let exclusions;
  if (raw.exclusions !== undefined) {
    const input = raw.exclusions;
    if (!input || !Array.isArray(input.episodes) || !Array.isArray(input.sources) || input.episodes.length > 5000 || input.sources.length > 10000) fail('Invalid deletion exclusions.');
    const episodes = input.episodes.map(entry => {
      if (!entry || !Number.isInteger(entry.season) || entry.season < 0 || !Number.isInteger(entry.number) || entry.number < 0 || !['episode','bumper'].includes(entry.kind) || !Array.isArray(entry.urls) || entry.urls.length > 20) fail('Invalid episode exclusion.');
      return {showId:id(entry.showId), title:text(entry.title, 'excluded episode title'), season:entry.season, number:entry.number, kind:entry.kind, urls:[...new Set(entry.urls.map(url=>parseSourceUrl(url).url))]};
    });
    const sources = input.sources.map(entry=>({showId:id(entry.showId),url:parseSourceUrl(entry.url).url}));
    if (episodes.length || sources.length) exclusions = {episodes,sources};
  }
  return { version: 1, epoch: raw.epoch, shows, ...(raw.publishedRevision ? {publishedRevision:raw.publishedRevision} : {}), ...(exclusions ? {exclusions} : {}), settings: { channel, bumpers: raw.settings.bumpers, rotation, shuffleSeed, storiesPerTurn, commercialCount, streamShow } };
}

export function parseCatalogJson(input) {
  if (typeof input !== 'string' || new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) fail('Import exceeds the 2 MB catalog limit.');
  let raw;
  try { raw = JSON.parse(input); } catch { fail('That file is not valid JSON. Your catalog has not changed.'); }
  return validateCatalog(raw);
}

export function readCatalog(storage, seed, {persistMigration = true} = {}) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    const catalog = raw ? parseCatalogJson(raw) : validateCatalog(seed);
    if (raw && persistMigration) {
      const previous = JSON.parse(raw);
      if (catalog.shows.some((show, index) => show.channel !== previous.shows[index].channel) || catalog.settings.channel !== previous.settings.channel) {
        try { saveCatalog(storage, catalog); } catch { /* The migrated catalog remains usable when storage is blocked. */ }
      }
    }
    return { catalog, error: null };
  }
  catch { return { catalog: validateCatalog(seed), error: 'Saved catalog could not be read. The starter catalog is shown. Import a backup to recover; saving a change replaces the unreadable copy.' }; }
}
export function saveCatalog(storage, catalog) {
  const valid = validateCatalog(catalog);
  const json = JSON.stringify(valid);
  if (new TextEncoder().encode(json).length > MAX_IMPORT_BYTES) fail('Catalog exceeds the 2 MB storage limit.');
  storage.setItem(STORAGE_KEY, json);
  return valid;
}

export function stationSource(episode) {
  return episode.sources.find(s => s.availability === 'verified' && s.provider !== 'tubi' && parseSourceUrl(s.url).kind === 'video') ?? null;
}

// The reserved commercial collection supplies breaks across every station scope.
// User bumpers remain scoped to the selected program shows.
export function bumperPool(catalog, shows) {
  const ids = new Set(shows.map(show => show.id)); ids.add(COMMERCIAL_SHOW_ID);
  return catalog.shows.filter(show => ids.has(show.id)).flatMap(show => show.episodes
    .filter(episode => episode.kind === 'bumper' && parseDuration(episode.durationSeconds) !== null && stationSource(episode))
    .slice().sort((a, b) => a.season - b.season || a.number - b.number)
    .map(episode => ({ show, episode, source: stationSource(episode), duration: episode.durationSeconds })));
}

export function buildSchedule(catalog, channel = catalog.settings.channel) {
  const shows = catalog.shows.filter(s => s.id !== COMMERCIAL_SHOW_ID && (s.id !== MOVIE_SHOW_ID || catalog.settings.streamShow === MOVIE_SHOW_ID) && (channel === 'mixed' || s.channel === channel) && (!catalog.settings.streamShow || s.id === catalog.settings.streamShow));
  const eligible = e => parseDuration(e.durationSeconds) !== null && stationSource(e);
  const entries = s => s.episodes.filter(eligible).sort((a, b) => a.season - b.season || a.number - b.number)
    .map(episode => ({ show: s, episode, source: stationSource(episode), duration: episode.durationSeconds }));
  const queues = shows.map(s => entries(s).filter(e => e.episode.kind === 'episode'));
  const bumpers = bumperPool(catalog, shows);
  if ((catalog.settings.rotation ?? 'random') === 'random') return randomRotation(queues, bumpers, { seed: catalog.settings.shuffleSeed ?? 1984, scope: `${channel}:${catalog.settings.streamShow || 'all'}`, storiesPerTurn: catalog.settings.storiesPerTurn ?? 1, includeBumpers: catalog.settings.bumpers, commercialCount: catalog.settings.commercialCount ?? 1 });
  const result = [];
  const nextBreak = createCommercialBreak(bumpers, { seed: catalog.settings.shuffleSeed ?? 1984, scope: `${channel}:${catalog.settings.streamShow || 'all'}:ordered`, commercialCount: catalog.settings.commercialCount ?? 1, randomize: false });
  while (queues.some(q => q.length)) {
    for (const queue of queues) {
      if (!queue.length) continue;
      const first = queue.shift(); result.push(first);
      while (first.episode.group && queue[0]?.episode.group === first.episode.group) result.push(queue.shift());
      if (catalog.settings.bumpers) result.push(...nextBreak());
    }
  }
  return result;
}

export function schedulePosition(schedule, epoch, now = Date.now() / 1000) {
  const duration = schedule.reduce((sum, e) => sum + e.duration, 0);
  if (!schedule.length || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(now) || !Number.isFinite(epoch)) return null;
  let offset = ((now - epoch) % duration + duration) % duration;
  for (let index = 0; index < schedule.length; index++) {
    if (offset < schedule[index].duration) return { index, offset, current: schedule[index], next: schedule[(index + 1) % schedule.length], remaining: schedule[index].duration - offset };
    offset -= schedule[index].duration;
  }
  return null;
}

export function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Runtime unknown';
  const n = Math.floor(seconds);
  return n >= 3600 ? `${Math.floor(n / 3600)}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}` : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

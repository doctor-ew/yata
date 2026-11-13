import { parseSourceUrl } from './domain.mjs';
const ID = /^[\w.-]{1,160}$/;
const MAX_HASH_LENGTH = 6000;
function showIdentifier(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw Error('Invalid shared show identifier.');
  return value;
}
function canonicalSource(value) {
  const source = parseSourceUrl(value);
  if (!['video', 'playlist', 'external'].includes(source.kind)) throw Error('Share an episode source, not an Archive item.');
  return source.url;
}
function timestamp(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 86400) throw Error('Invalid shared playback time.');
  return Math.floor(value);
}
function pageUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error('Invalid sharing page URL.');
  return url;
}

export function createEpisodeLink({ baseUrl, showId, sourceUrl, seconds = 0 }) {
  const url = pageUrl(baseUrl);
  const params = new URLSearchParams({ show: showIdentifier(showId), source: canonicalSource(sourceUrl), t: String(timestamp(seconds)) });
  if (params.toString().length > MAX_HASH_LENGTH) throw Error('This episode link is too long to share.');
  url.hash = params.toString();
  return url.href;
}

export function parseEpisodeLink(value) {
  try {
    const url = pageUrl(value);
    const hash = url.hash.slice(1);
    if (!hash || hash.length > MAX_HASH_LENGTH) return null;
    decodeURIComponent(hash); // Reject malformed escapes rather than silently replacing them.
    const params = new URLSearchParams(hash);
    if (!params.has('show') || !params.has('source')) return null;
    if ([...params.keys()].some(key => !['show', 'source', 't'].includes(key))) return null;
    if (['show', 'source', 't'].some(key => params.getAll(key).length > 1)) return null;
    const rawTime = params.get('t') ?? '0';
    if (!/^\d+(?:\.\d+)?$/.test(rawTime)) return null;
    return { showId: showIdentifier(params.get('show')), sourceUrl: canonicalSource(params.get('source')), seconds: timestamp(Number(rawTime)) };
  } catch { return null; }
}

export function findSharedEpisode(catalog, descriptor) {
  try {
    if (!descriptor || !Array.isArray(catalog?.shows)) return null;
    const wanted = canonicalSource(descriptor.sourceUrl);
    const showId = descriptor.showId === undefined ? null : showIdentifier(descriptor.showId);
    for (const show of catalog.shows) {
      if (showId !== null && show.id !== showId) continue;
      if (!Array.isArray(show.episodes)) continue;
      for (const episode of show.episodes) {
        if (!Array.isArray(episode.sources)) continue;
        for (const source of episode.sources) {
          try { if (canonicalSource(source.url) === wanted) return { show, episode, source }; } catch { /* Skip malformed catalog sources. */ }
        }
      }
    }
  } catch { /* Untrusted or unsupported descriptors never create catalog entries. */ }
  return null;
}

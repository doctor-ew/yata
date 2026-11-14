import { episodeTitleKey, excludedEpisode, excludedSource, restoreExcluded } from './exclusions.mjs';
import { parseSourceUrl, parseDuration, validateCatalog } from './domain.mjs';

export function youtubeEpisodes(data) {
  const entries = Array.isArray(data?.entries) ? data.entries : [data];
  if (!entries.length || entries.length > 200) throw Error('Use a playlist with 1–200 videos. Split larger playlists into smaller batches.');
  return entries.map((entry, index) => {
    const source = parseSourceUrl(`https://www.youtube.com/watch?v=${entry?.id}`);
    if (!entry?.title || source.kind !== 'video') throw Error('YouTube returned incomplete video metadata.');
    const order = entry.title.match(/\b(?:s|season\s*)(\d+)\s*(?:[|·:-]\s*)?(?:e|episode\s*)(\d+)\b/i);
    return { id: `youtube-${source.videoId}`, title: entry.title.slice(0, 500),
      season: order ? Number(order[1]) : 0, number: order ? Number(order[2]) : index + 1,
      durationSeconds: parseDuration(entry.duration), group: '', kind: 'episode',
      sources: [{ id: `source-${source.videoId}`, provider: 'youtube', url: source.url, availability: 'unverified' }] };
  });
}

export function mergeBatch(catalog, rows, makeId = () => crypto.randomUUID()) {
  const next = structuredClone(catalog);
  const known = new Set(next.shows.flatMap(s => s.episodes.flatMap(e => e.sources.map(s => s.url))));
  let added = 0, skipped = 0;
  for (const row of rows) {
    if (!row.selected) continue;
    const show = next.shows.find(s => s.id === row.showId);
    if (!show) throw Error('Choose an existing show for every selected episode.');
    const episode = structuredClone(row.episode);
    if (episode.sources.some(s => known.has(s.url))) { skipped++; continue; }
    episode.id = `episode-${makeId()}`;
    episode.sources.forEach(s => { s.id = `source-${makeId()}`; known.add(s.url); });
    restoreExcluded(next, show, episode); show.episodes.push(episode); added++;
  }
  if (!added) throw Error('No new episodes selected. Existing source URLs are skipped automatically.');
  return { catalog: validateCatalog(next), added, skipped };
}

// Numbering differs between providers: require matching title AND explicit order.
export function mergeLibraryBatch(catalog, rows, makeId = () => crypto.randomUUID()) {
  const next = structuredClone(catalog);
  const known = new Set(next.shows.flatMap(s => s.episodes.flatMap(e => e.sources.map(s => s.url))));
  let added = 0, skipped = 0, alternatives = 0;
  for (const row of rows) {
    if (!row.selected) continue;
    const show = next.shows.find(s => s.id === row.showId);
    if (!show) throw Error('Choose an existing show for every selected episode.');
    const incoming = structuredClone(row.episode);
    if (excludedEpisode(next, show, incoming)) { skipped++; continue; }
    const unique = new Map();
    for (const source of incoming.sources) {
      const url = parseSourceUrl(source.url).url;
      if (!known.has(url) && !unique.has(url) && !excludedSource(next, show.id, url)) unique.set(url, source);
    }
    const fresh = [...unique.values()];
    if (!fresh.length) { skipped++; continue; }
    const titleKey = episodeTitleKey(incoming.title, show.title);
    const match = titleKey.length > 3 && incoming.season > 0 && incoming.number > 0 && incoming.kind === 'episode'
      ? show.episodes.find(e => e.kind === 'episode' && e.season === incoming.season && e.number === incoming.number && episodeTitleKey(e.title, show.title) === titleKey) : null;
    if (match) {
      const slots = 20 - match.sources.length;
      if (fresh.length > slots) throw Error('An episode has more than 20 alternative sources. Deselect excess alternatives before adding.');
      for (const source of fresh) {
        source.url = parseSourceUrl(source.url).url;
        match.sources.push({ ...source, id: `source-${makeId()}` }); known.add(source.url); alternatives++;
      }
      if (!match.durationSeconds && incoming.durationSeconds) match.durationSeconds = incoming.durationSeconds;
    } else {
      incoming.id = `episode-${makeId()}`;
      incoming.sources = fresh.map(source => {
        const url = parseSourceUrl(source.url).url; known.add(url);
        return { ...source, url, id: `source-${makeId()}` };
      });
      show.episodes.push(incoming); added++;
    }
  }
  return { catalog: validateCatalog(next), added, skipped, alternatives };
}

export function discoveryRows(catalog, packs) {
  const shows = new Set(catalog.shows.map(show => show.id));
  const rows = [];
  for (const pack of packs) {
    if (!Array.isArray(pack?.shows)) throw Error('Discovery file is incomplete.');
    for (const show of pack.shows) {
      if (!shows.has(show.showId) || !Array.isArray(show.episodes)) throw Error('Discovery file contains an unknown show or missing episodes.');
      for (const episode of show.episodes) rows.push({ selected: true, showId: show.showId, episode: structuredClone(episode) });
    }
  }
  // Validate candidate metadata and source URLs before presenting it as importable.
  mergeLibraryBatch(catalog, rows);
  return rows;
}

// Extend an older library without replacing its shows, sources, or settings.
export function extendLibraryCatalog(catalog, seed) {
  const base = structuredClone(catalog);
  for (const show of seed.shows) if (!base.shows.some(existing => existing.id === show.id)) base.shows.push(structuredClone(show));
  return validateCatalog(base);
}

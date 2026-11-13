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
    show.episodes.push(episode); added++;
  }
  if (!added) throw Error('No new episodes selected. Existing source URLs are skipped automatically.');
  return { catalog: validateCatalog(next), added, skipped };
}

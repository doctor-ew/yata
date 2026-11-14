export function episodeTitleKey(title, showTitle) {
  const normalize = value => value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  let value = String(title).split(/[|·]/)[0].replace(/\.(mp4|mkv|avi)$/i, '').replace(/\bS\s*\d+\s*E\s*\d+\b/ig, ' ').replace(/\b\d+\s*x\s*\d+\b/ig, ' ');
  value = normalize(value).replace(/^\d+\s+/, '');
  const prefix = normalize(showTitle);
  return value.startsWith(prefix + ' ') ? value.slice(prefix.length + 1) : value;
}
export function excludedEpisode(catalog, show, episode) {
  return (catalog.exclusions?.episodes || []).some(entry => entry.showId === show.id && (
    episode.sources.some(source => entry.urls.includes(source.url)) ||
    (entry.season > 0 && entry.number > 0 && entry.season === episode.season && entry.number === episode.number && entry.kind === episode.kind && episodeTitleKey(entry.title, show.title) === episodeTitleKey(episode.title, show.title))));
}
export function excludedSource(catalog, showId, url) { return (catalog.exclusions?.sources || []).some(entry => entry.showId === showId && entry.url === url); }
export function excludeEpisode(catalog, show, episode) {
  const exclusions = catalog.exclusions ||= {episodes:[], sources:[]};
  exclusions.episodes.push({showId:show.id, title:episode.title, season:episode.season, number:episode.number, kind:episode.kind, urls:episode.sources.map(source=>source.url)});
}
export function excludeSource(catalog, showId, url) {
  const exclusions = catalog.exclusions ||= {episodes:[], sources:[]};
  if (!excludedSource(catalog, showId, url)) exclusions.sources.push({showId,url});
}
// Explicitly adding a source is an intentional restoration, unlike a background
// library update. Other exclusions stay intact.
export function restoreExcluded(catalog, show, episode) {
  if (!catalog.exclusions) return;
  catalog.exclusions.episodes = catalog.exclusions.episodes.filter(entry => !excludedEpisode({exclusions:{episodes:[entry]}},show,episode));
  catalog.exclusions.sources = catalog.exclusions.sources.filter(entry => entry.showId !== show.id || !episode.sources.some(source=>source.url===entry.url));
}

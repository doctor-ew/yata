import { buildSchedule, parseSourceUrl, stationSource } from './domain.mjs';

export function playbackTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--:--';
  const total = Math.floor(seconds);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(n => String(n).padStart(2, '0')).join(':');
}
export function seekPosition(seconds, duration) {
  return Number.isFinite(seconds) && Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(seconds, duration)) : null;
}
export function playbackQueue(catalog, active) {
  if (!active) return [];
  if (active.queueMode === 'station') return buildSchedule(catalog);
  const show = catalog.shows.find(show => show.id === active.showId);
  return (show?.episodes || []).slice().sort((a, b) => a.season - b.season || a.number - b.number).flatMap(episode => {
    const source = stationSource(episode) || episode.sources.find(source => source.provider !== 'tubi' && ['video', 'playlist'].includes(parseSourceUrl(source.url).kind));
    return source ? [{ show, episode, source }] : [];
  });
}
export function adjacentPlayback(catalog, active, direction) {
  const queue = playbackQueue(catalog, active);
  const position = active?.queuePosition;
  const matches = index => queue[index]?.episode.id === active?.episodeId && (!position || queue[(index - 1 + queue.length) % queue.length]?.episode.id === position.previousId);
  const index = position && Number.isInteger(position.index) && matches(position.index) ? position.index : queue.findIndex((entry, index) => matches(index));
  if (index < 0 || ![-1, 1].includes(direction) || !queue.length) return null;
  const next = index + direction;
  if (active.queueMode !== 'station' && (next < 0 || next >= queue.length)) return null;
  const target = (next + queue.length) % queue.length;
  return { ...queue[target], queuePosition: { index: target, previousId: queue[(target - 1 + queue.length) % queue.length].episode.id } };
}

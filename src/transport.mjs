import { buildSchedule, parseSourceUrl, stationSource, bumperPool, COMMERCIAL_SHOW_ID } from './domain.mjs';
import { seededRandom, shuffled } from './shuffle.mjs';

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
  const ownerShowId = active.queuePosition?.ownerShowId || active.showId;
  const show = catalog.shows.find(show => show.id === ownerShowId && show.id !== COMMERCIAL_SHOW_ID);
  if (!show) return [];
  const programs = show.episodes.filter(episode => episode.kind === 'episode').slice().sort((a, b) => a.season - b.season || a.number - b.number).flatMap(episode => {
    const source = stationSource(episode) || episode.sources.find(source => source.provider !== 'tubi' && ['video', 'playlist'].includes(parseSourceUrl(source.url).kind));
    return source ? [{ show, episode, source }] : [];
  });
  if (!catalog.settings.bumpers) return programs;
  const bumpers = shuffled(bumperPool(catalog, [show]), seededRandom(catalog.settings.shuffleSeed ?? 1984, `manual:${show.id}:bumpers`));
  if (!bumpers.length) return programs;
  const queue = []; let bumperIndex = 0;
  for (let index = 0; index < programs.length; index++) {
    const entry = programs[index], next = programs[index + 1]; queue.push(entry);
    // Multipart stories stay intact and a finished manual queue has no trailing ad.
    if (next && !(entry.episode.group && entry.episode.group === next.episode.group)) queue.push(bumpers[bumperIndex++ % bumpers.length]);
  }
  return queue;
}
export function adjacentPlayback(catalog, active, direction) {
  if (!active || ![-1, 1].includes(direction)) return null;
  const queue = playbackQueue(catalog, active);
  if (!queue.length) return null;
  const position = active.queuePosition;
  const matches = index => queue[index]?.episode.id === active.episodeId && (!position || queue[(index - 1 + queue.length) % queue.length]?.episode.id === position.previousId);
  let index = position && Number.isInteger(position.index) && matches(position.index) ? position.index : queue.findIndex((entry, index) => matches(index));
  if (index < 0) {
    // Catalog edits can change the predecessor; retain the nearest current occurrence.
    const candidates = queue.map((entry, index) => entry.episode.id === active.episodeId ? index : -1).filter(index => index >= 0);
    if (candidates.length) index = candidates.reduce((best, candidate) => Math.abs(candidate - (position?.index ?? 0)) < Math.abs(best - (position?.index ?? 0)) ? candidate : best);
  }
  const station = active.queueMode === 'station';
  const currentEpisode = catalog.shows.find(show => show.id === active.showId)?.episodes.find(episode => episode.id === active.episodeId);
  let next;
  if (index >= 0) next = index + direction;
  else if (position && (position.isBumper || active.showId === COMMERCIAL_SHOW_ID || currentEpisode?.kind === 'bumper')) {
    // Turning breaks off (or removing a failed ad) must not lose the program queue.
    const wanted = direction === 1 ? position.nextId : position.previousId;
    const neighbor = queue.findIndex(entry => entry.episode.id === wanted);
    if (neighbor >= 0) next = neighbor;
    else {
      const opposite = direction === 1 ? position.previousId : position.nextId;
      const anchor = queue.findIndex(entry => entry.episode.id === opposite);
      if (anchor < 0) return null;
      next = anchor + direction;
    }
  } else return null;
  if (!station && (next < 0 || next >= queue.length)) return null;
  const target = (next + queue.length) % queue.length;
  const previous = queue[(target - 1 + queue.length) % queue.length];
  const following = queue[(target + 1) % queue.length];
  return { ...queue[target], queuePosition: {
    index: target, previousId: previous.episode.id,
    nextId: station || target + 1 < queue.length ? following.episode.id : null,
    isBumper: queue[target].episode.kind === 'bumper',
    ...(!station ? {ownerShowId: position?.ownerShowId || active.showId} : {}),
  } };
}

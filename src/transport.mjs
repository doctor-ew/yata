import { buildSchedule, parseSourceUrl, stationSource, bumperPool, COMMERCIAL_SHOW_ID } from './domain.mjs';
import { createCommercialBreak } from './shuffle.mjs';

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
  const bumpers = bumperPool(catalog, [show]);
  if (!bumpers.length) return programs;
  const queue = [];
  const nextBreak = createCommercialBreak(bumpers, { seed: catalog.settings.shuffleSeed ?? 1984, scope: `manual:${show.id}`, commercialCount: catalog.settings.commercialCount ?? 1 });
  for (let index = 0; index < programs.length; index++) {
    const entry = programs[index], next = programs[index + 1]; queue.push(entry);
    // Multipart stories stay intact and a finished manual queue has no trailing ad.
    if (next && !(entry.episode.group && entry.episode.group === next.episode.group)) queue.push(...nextBreak());
  }
  return queue;
}
// Program anchors survive a whole ad block disappearing while a clip is active.
export function playbackPosition(queue, index, ownerShowId = null) {
  if (!queue.length || !queue[index]) return null;
  const neighborProgram = direction => {
    for (let step = 1; step < queue.length; step++) {
      const entry = queue[(index + direction * step + queue.length) % queue.length];
      if (entry.episode.kind === 'episode') return entry.episode.id;
    }
    return null;
  };
  const isBumper = queue[index].episode.kind === 'bumper';
  return {
    index, previousId: queue[(index - 1 + queue.length) % queue.length].episode.id,
    nextId: queue[(index + 1) % queue.length].episode.id, isBumper,
    ...(isBumper ? {previousProgramId: neighborProgram(-1), nextProgramId: neighborProgram(1)} : {}),
    ...(ownerShowId ? {ownerShowId} : {}),
  };
}
export function adjacentPlayback(catalog, active, direction) {
  if (!active || ![-1, 1].includes(direction)) return null;
  const queue = playbackQueue(catalog, active);
  if (!queue.length) return null;
  const position = active.queuePosition;
  const anchoredBreak = position?.isBumper && (position.previousProgramId || position.nextProgramId);
  const contextMatches = index => {
    if (!anchoredBreak) return true;
    const context = playbackPosition(queue, index);
    return (!position.previousProgramId || context.previousProgramId === position.previousProgramId) && (!position.nextProgramId || context.nextProgramId === position.nextProgramId);
  };
  const matches = index => queue[index]?.episode.id === active.episodeId && (!position || queue[(index - 1 + queue.length) % queue.length]?.episode.id === position.previousId) && contextMatches(index);
  let index = position && Number.isInteger(position.index) && matches(position.index) ? position.index : queue.findIndex((entry, index) => matches(index));
  if (index < 0) {
    // Catalog edits can change predecessors, but an ad must retain its program block.
    const candidates = queue.map((entry, index) => entry.episode.id === active.episodeId && contextMatches(index) ? index : -1).filter(index => index >= 0);
    if (candidates.length) index = candidates.reduce((best, candidate) => Math.abs(candidate - (position?.index ?? 0)) < Math.abs(best - (position?.index ?? 0)) ? candidate : best);
  }
  const station = active.queueMode === 'station';
  const currentEpisode = catalog.shows.find(show => show.id === active.showId)?.episodes.find(episode => episode.id === active.episodeId);
  let next;
  if (index >= 0) next = index + direction;
  else if (position && (position.isBumper || active.showId === COMMERCIAL_SHOW_ID || currentEpisode?.kind === 'bumper')) {
    // Turning breaks off (or removing a failed ad) must not lose the program queue.
    const wanted = direction === 1 ? position.nextProgramId || position.nextId : position.previousProgramId || position.previousId;
    const neighbor = queue.findIndex(entry => entry.episode.id === wanted);
    if (neighbor >= 0) next = neighbor;
    else {
      const opposite = direction === 1 ? position.previousProgramId || position.previousId : position.nextProgramId || position.nextId;
      const anchor = queue.findIndex(entry => entry.episode.id === opposite);
      if (anchor < 0) return null;
      for (let step = 1; step <= queue.length; step++) {
        const candidate = anchor + direction * step;
        if (!station && (candidate < 0 || candidate >= queue.length)) break;
        const wrapped = (candidate + queue.length) % queue.length;
        if (queue[wrapped].episode.kind === 'episode') { next = candidate; break; }
      }
      if (next === undefined) return null;
    }
  } else return null;
  if (!station && (next < 0 || next >= queue.length)) return null;
  const target = (next + queue.length) % queue.length;
  return { ...queue[target], queuePosition: playbackPosition(queue, target, station ? null : position?.ownerShowId || active.showId) };
}

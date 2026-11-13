import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackTime, seekPosition, playbackQueue, adjacentPlayback } from '../src/transport.mjs';
import { createSeed } from '../src/catalog.mjs';
import { createVideoSession, createYouTubeSession } from '../src/players.mjs';

test('elapsed and total times retain hours without wrapping and unknown values are explicit', () => {
 assert.equal(playbackTime(35.9), '00:00:35');
 assert.equal(playbackTime(47 * 3600 + 25 * 60 + 35), '47:25:35');
 assert.equal(playbackTime(0), '00:00:00');
 for (const value of [null, undefined, NaN, Infinity, -1]) assert.equal(playbackTime(value), '--:--:--');
 assert.equal(seekPosition(-10, 90), 0); assert.equal(seekPosition(100, 90), 90);
 assert.equal(seekPosition(50, null), null); assert.equal(seekPosition(NaN, 90), null);
});

test('manual previous/next stays in the show, permits unchecked videos, skips Tubi and stops at boundaries', () => {
 const catalog = createSeed(), show = catalog.shows.find(s => s.id === 'dukes');
 const first = show.episodes[0];
 const second = { ...structuredClone(first), id: 'second', number: 6, durationSeconds: null, sources: [{ id: 'youtube', provider: 'youtube', availability: 'unverified', url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE' }] };
 const tubi = { ...structuredClone(first), id: 'tubi', number: 7, sources: structuredClone(catalog.shows.find(s => s.id === 'gi-joe').episodes[0].sources) };
 show.episodes.push(second, tubi);
 const active = { showId: show.id, episodeId: first.id, queueMode: 'show' };
 assert.equal(playbackQueue(catalog, active).length, 2);
 assert.equal(adjacentPlayback(catalog, active, -1), null);
 assert.equal(adjacentPlayback(catalog, active, 1).episode.id, 'second');
 assert.equal(adjacentPlayback(catalog, { ...active, episodeId: second.id }, 1), null);
 assert.equal(adjacentPlayback(catalog, { ...active, episodeId: second.id }, -1).episode.id, first.id);
 const station = { ...active, queueMode: 'station' };
 assert.equal(playbackQueue(catalog, station).length, 1);
 assert.equal(adjacentPlayback(catalog, station, 1).episode.id, first.id);
});

class Video extends EventTarget {
 duration = 120; currentTime = 35; volume = .75; muted = false; paused = true;
 play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; }
 removeAttribute() {} load() {}
}
test('native transport gates readiness, clamps seeks, preserves pause, controls audio and ignores disposed commands', async () => {
 const video = new Video();
 const session = createVideoSession(video, { url: 'https://archive.org/download/sample/video.mp4' });
 assert.equal(session.getState().ready, false); assert.equal(session.seek(10), false);
 video.dispatchEvent(new Event('loadedmetadata')); assert.equal(session.getState().ready, true);
 session.seek(35); assert.equal(video.currentTime, 35); assert.equal(video.paused, true);
 session.seek(-10); assert.equal(video.currentTime, 0); session.seek(500); assert.equal(video.currentTime, 120);
 await session.play(); assert.equal(session.getState().paused, false); session.pause(); assert.equal(video.paused, true);
 session.setVolume(.4); assert.equal(video.volume, .4); assert.equal(video.muted, false);
 session.setMuted(true); assert.equal(session.getState().muted, true); assert.equal(video.volume, .4);
 session.setVolume(2); assert.equal(video.volume, 1); assert.equal(video.muted, false);
 session.dispose(); assert.equal(session.getState().ready, false); assert.equal(session.seek(20), false);
 session.setVolume(.1); assert.equal(video.volume, 1);
});

test('YouTube transport uses official seek/audio/pause methods and owns playlist navigation', async () => {
 let options, player; const seeks = [], moves = [];
 class Player {
  state = 2; volume = 75; muted = false; position = 35;
  constructor(host, opts) { options = opts; player = this; }
  playVideo() { this.state = 1; } pauseVideo() { this.state = 2; }
  getDuration() { return 1800; } getCurrentTime() { return this.position; }
  getPlayerState() { return this.state; } getVolume() { return this.volume; } isMuted() { return this.muted; }
  seekTo(seconds, ahead) { this.position = seconds; seeks.push([seconds, ahead]); }
  setVolume(value) { this.volume = value; } mute() { this.muted = true; } unMute() { this.muted = false; }
  nextVideo() { moves.push('next'); } previousVideo() { moves.push('previous'); } destroy() {}
 }
 const session = createYouTubeSession({}, { source: { url: 'https://www.youtube.com/playlist?list=PL1234567890' }, apiLoader: async () => ({ Player }) });
 await session.ready;
 assert.equal(session.getState().ready, false); assert.equal(session.seek(10), false);
 options.events.onReady({ target: player }); assert.equal(session.getState().ready, true);
 session.pause(); assert.equal(session.getState().paused, true);
 session.seek(-10); session.seek(2000); assert.deepEqual(seeks, [[0, true], [1800, true]]);
 assert.equal(session.getState().paused, true);
 session.setVolume(.456); assert.equal(player.volume, 46); session.setMuted(true); assert.equal(session.getState().muted, true);
 session.navigatePlaylist(1); session.navigatePlaylist(-1); assert.deepEqual(moves, ['next', 'previous']);
 options.events.onError({ data: 150 }); assert.equal(session.getState().ready, false);
 session.dispose(); assert.equal(session.seek(20), false); assert.equal(session.navigatePlaylist(1), false);
});

test('station previous/next retains repeated bumper occurrence instead of looping at the first bumper', () => {
 const catalog = createSeed(), show = catalog.shows.find(s => s.id === 'dukes'), original = show.episodes[0];
 catalog.shows.forEach(s => { s.episodes = []; });
 show.episodes = [1, 2, 3].map(number => ({ ...structuredClone(original), id: `episode-${number}`, number }));
 show.episodes.push({ ...structuredClone(original), id: 'bumper', kind: 'bumper', durationSeconds: 15 });
 catalog.settings.bumpers = true; catalog.settings.rotation = 'ordered';
 let active = { showId: show.id, episodeId: 'episode-1', queueMode: 'station' };
 const visited = [];
 for (let i = 0; i < 6; i++) {
  const next = adjacentPlayback(catalog, active, 1); visited.push(next.episode.id);
  active = { ...active, episodeId: next.episode.id, queuePosition: next.queuePosition };
 }
 assert.deepEqual(visited, ['bumper', 'episode-2', 'bumper', 'episode-3', 'bumper', 'episode-1']);
 const previous = adjacentPlayback(catalog, active, -1);
 assert.equal(previous.queuePosition.index, 5);
 assert.equal(adjacentPlayback(catalog, { ...active, episodeId: previous.episode.id, queuePosition: previous.queuePosition }, -1).episode.id, 'episode-3');
});

test('queue navigation recovers after a catalog edit changes the predecessor', () => {
 const catalog = createSeed(), show = catalog.shows.find(s => s.id === 'dukes'), base = show.episodes[0];
 show.episodes = [1, 3].map(number => ({ ...structuredClone(base), id: `entry-${number}`, number }));
 const active = { showId: show.id, episodeId: 'entry-3', queueMode: 'show', queuePosition: { index: 1, previousId: 'entry-1' } };
 show.episodes.push({ ...structuredClone(base), id: 'entry-2', number: 2 });
 assert.equal(adjacentPlayback(catalog, active, -1).episode.id, 'entry-2');
});

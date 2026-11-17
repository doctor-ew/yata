import { seekPosition } from './transport.mjs';
import { parseSourceUrl } from './domain.mjs';

export function createVideoSession(video, { url, offset = 0, onEnd = () => {}, onVerified = () => {}, onError = () => {} }) {
  let disposed = false, ended = false, metadataReady = false, failed = false, initialSeekApplied = false;
  const metadata = () => {
    if (disposed) return;
    metadataReady = true; failed = false;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      if(!initialSeekApplied){video.currentTime = Math.max(0, Math.min(offset, Math.max(0, video.duration - 0.1)));initialSeekApplied=true;}
      onVerified(video.duration);
    }
  };
  const finish = () => { if (!disposed && !ended) { ended = true; onEnd(); } };
  const error = () => { failed = true; if (!disposed) onError('This video could not be loaded. Retry, skip, or open the original source.'); };
  video.addEventListener('loadedmetadata', metadata);
  video.addEventListener('ended', finish);
  video.addEventListener('error', error);
  video.src = url;
  return {
    async play() {
      if (disposed) return;
      try { await video.play(); }
      catch { if (!disposed) onError('Playback needs your click. Use the player’s Play control, or Retry.'); }
    },
    pause() { if (!disposed) video.pause(); },
    getState() { return { ready: !disposed && metadataReady && !failed, currentTime: Number(video.currentTime) || 0,
      duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null,
      paused: video.paused, volume: Number.isFinite(video.volume) ? video.volume : 1, muted: !!video.muted, playlist: false }; },
    seek(seconds) {
      const target = seekPosition(seconds, video.duration);
      if (disposed || failed || !metadataReady || target === null) return false;
      try { ended = false; video.currentTime = target; return true; } catch { return false; }
    },
    setVolume(value) { if (!disposed && Number.isFinite(value)) { video.volume = Math.max(0, Math.min(1, value)); video.muted = value === 0; } },
    setMuted(value) { if (!disposed) video.muted = !!value; },
    dispose() {
      if (disposed) return;
      disposed = true;
      video.removeEventListener('loadedmetadata', metadata);
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', error);
      video.pause(); video.removeAttribute('src'); video.load();
    },
  };
}

let youtubePromise;
export function loadYouTube() {
  if (globalThis.YT?.Player) return Promise.resolve(globalThis.YT);
  if (youtubePromise) return youtubePromise;
  youtubePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const previous = globalThis.onYouTubeIframeAPIReady;
    const finish = error => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      globalThis.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); youtubePromise = null; reject(error); }
      else resolve(globalThis.YT);
    };
    const timer = setTimeout(() => finish(new Error('YouTube did not respond. Retry or open the video on YouTube.')), 12000);
    globalThis.onYouTubeIframeAPIReady = () => { if (typeof previous === 'function') previous(); finish(); };
    script.src = 'https://www.youtube.com/iframe_api';
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onerror = () => finish(new Error('YouTube’s player could not load. Check your connection or open the source.'));
    document.head.append(script);
  });
  return youtubePromise;
}

const YOUTUBE_ERRORS = {
  2: 'YouTube rejected this video address.',
  5: 'YouTube could not play this video in this browser.',
  100: 'This YouTube video is unavailable or private.',
  101: 'The owner does not permit embedding. Open this video on YouTube.',
  150: 'The owner does not permit embedding. Open this video on YouTube.',
  153: 'YouTube could not identify this player. Open the station over its local HTTP URL, or watch on YouTube.',
};

export function createYouTubeSession(host, { source, offset = 0, origin = globalThis.location?.origin,
  onEnd = () => {}, onVerified = () => {}, onError = () => {}, onState = () => {}, apiLoader = loadYouTube }) {
  let disposed = false, ended = false, player, playerReady = false, failed = false;
  const parsed = parseSourceUrl(source.url);
  const safe = callback => (...args) => { if (!disposed) callback(...args); };
  const ready = apiLoader().then(api => {
    if (disposed) return;
    const playerVars = { controls: 1, autoplay: 1, playsinline: 1, origin };
    if (parsed.kind === 'playlist') { playerVars.listType = 'playlist'; playerVars.list = parsed.playlistId; }
    else playerVars.start = Math.max(0, Math.floor(offset));
    player = new api.Player(host, {
      width: '100%', height: '100%', videoId: parsed.videoId, playerVars,
      events: {
        onReady: safe(event => { playerReady = true; event.target.playVideo(); }),
        onAutoplayBlocked: safe(() => onError('YouTube needs a click. Press Play in the embedded player.')),
        onError: safe(event => { failed = true; onError(YOUTUBE_ERRORS[event.data] || 'YouTube playback failed. Retry or open the original source.'); }),
        onStateChange: safe(event => {
          onState(event.data);
          if (event.data === 1) {
            failed = false; ended = false;
            const duration = event.target.getDuration();
            if (Number.isFinite(duration) && duration > 0) onVerified(duration);
          }
          // Playlist advancement belongs to the official player, not the station queue.
          if (event.data === 0 && parsed.kind !== 'playlist' && !ended) { ended = true; onEnd(); }
        }),
      },
    });
  }).catch(safe(error => onError(error.message)));
  return { ready, play() { if (!disposed) player?.playVideo(); },
    pause() { if (!disposed) player?.pauseVideo(); },
    getState() {
      const state = !disposed && playerReady ? player?.getPlayerState?.() : -1;
      const duration = !disposed && playerReady ? player?.getDuration?.() : 0;
      return { ready: !disposed && playerReady && !failed, currentTime: !disposed && playerReady ? Number(player?.getCurrentTime?.()) || 0 : 0,
        duration: Number.isFinite(duration) && duration > 0 ? duration : null, paused: state !== 1 && state !== 3,
        volume: !disposed && playerReady ? (Number(player?.getVolume?.()) || 0) / 100 : 1,
        muted: !disposed && playerReady ? !!player?.isMuted?.() : false, playlist: parsed.kind === 'playlist' };
    },
    seek(seconds) {
      const duration = !disposed && playerReady ? player?.getDuration?.() : 0;
      const target = seekPosition(seconds, duration);
      if (disposed || !playerReady || failed || target === null) return false;
      ended = false; player.seekTo(target, true); return true;
    },
    setVolume(value) { if (!disposed && playerReady && Number.isFinite(value)) { player.setVolume(Math.round(Math.max(0, Math.min(1, value)) * 100)); if (value > 0) player.unMute(); else player.mute(); } },
    setMuted(value) { if (!disposed && playerReady) { if (value) player.mute(); else player.unMute(); } },
    navigatePlaylist(direction) {
      if (disposed || !playerReady || parsed.kind !== 'playlist') return false;
      if (direction < 0) player.previousVideo(); else player.nextVideo(); return true;
    },
    dispose() { disposed = true; playerReady = false; player?.destroy(); } };
}

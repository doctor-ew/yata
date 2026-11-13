import { mountRetroEffects } from './retro-effects.mjs';
import { mountWindowMode } from './window-mode.mjs';
import { playbackTime, adjacentPlayback } from './transport.mjs';
import { STARTER_PACK } from './starter-pack.mjs';
import { youtubeEpisodes, mergeBatch, mergeLibraryBatch, discoveryRows } from './bulk.mjs';
import { CHANNELS, createSeed } from './catalog.mjs';
import { parseSourceUrl, parseDuration, importArchive, validateCatalog, parseCatalogJson,
  readCatalog, saveCatalog, buildSchedule, schedulePosition, stationSource, timeLabel, MAX_IMPORT_BYTES, COMMERCIAL_SHOW_ID } from './domain.mjs';
import { createVideoSession, createYouTubeSession } from './players.mjs';

const $ = id => document.getElementById(id);
const staticHosting = document.querySelector('meta[name="drew-tv-hosting"]')?.content === 'static';
const storage = { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) };
const retroEffects = mountRetroEffects({ body: document.body, shell: $('player-shell'), screenToggle: $('crt-look'), staticToggle: $('tuning-static'), storage });
const loaded = readCatalog(storage, createSeed());
let catalog = loaded.catalog;
let selectedShowId = catalog.shows[0].id, editingEpisodeId = null;
let session = null, active = null, playerGeneration = 0, importBusy = false;
let scrubbing = false, scrubSession = null, audioSession = null, preferredAudio = null, audioLockUntil = 0;
let navCatalog = null, navActive = null, previousEntry = null, nextEntry = null;
const providerName = { archive: 'Internet Archive', youtube: 'YouTube', tubi: 'Tubi' };
const tiles = ['#435a53', '#5c4257', '#3f526a', '#67513d', '#514a70', '#4f5e40', '#674849', '#3c6262'];
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content != null) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function button(label, action, className = 'button small') {
  const node = element('button', label, className); node.type = 'button'; node.addEventListener('click', action); return node;
}
function link(label, href, className = '') {
  const node = element('a', label, className); node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node;
}
function notify(message) { $('notice').textContent = message; $('notice').hidden = !message; }
function copyCatalog() { return structuredClone(catalog); }
function commit(next) {
  try { catalog = saveCatalog(storage, next); return true; }
  catch (error) { notify(`Could not save this change: ${error.message}. Your previous catalog is unchanged.`); return false; }
}
function selectedChannel() { return CHANNELS.find(c => c.id === catalog.settings.channel); }
function channelShows() { return catalog.shows.filter(s => s.id === COMMERCIAL_SHOW_ID || catalog.settings.channel === 'mixed' || s.channel === catalog.settings.channel); }
function currentGuide() { return schedulePosition(buildSchedule(catalog), catalog.epoch); }
function episodeDetail(e) {
  const order = e.season ? `S${String(e.season).padStart(2, '0')} · E${String(e.number).padStart(2, '0')}` : `Item ${e.number}`;
  return `${e.kind === 'bumper' ? 'Commercial / bumper' : order} · ${timeLabel(e.durationSeconds)}${e.group ? ` · ${e.group}` : ''}`;
}

function renderChannels() {
  $('channels').replaceChildren(...CHANNELS.map(c => {
    const node = button('', () => {
      const next = copyCatalog(); next.settings.channel = c.id; next.settings.streamShow = null;
      if (commit(next)) { selectedShowId = channelShows()[0]?.id || catalog.shows[0].id; stopPlayer(); render(); retroEffects.pulse(); }
    }, 'channel');
    node.setAttribute('aria-pressed', String(c.id === catalog.settings.channel));
    node.setAttribute('aria-label', `Channel ${c.number}: ${c.name}`);
    const number = element('span', null, 'channel-number'); number.append(element('small', 'CH'), document.createTextNode(c.number));
    const label = element('span'); label.append(element('span', c.name, 'channel-name'), element('span', catalog.settings.rotation === 'ordered' ? 'Episodes in order' : c.subtitle, 'channel-subtitle'));
    node.append(number, label, element('span', null, 'dot')); return node;
  }));
  const channel = selectedChannel();
  const streamShow = catalog.shows.find(show => show.id === catalog.settings.streamShow);
  $('channel-label').textContent = `CH ${channel.number} · ${(streamShow?.title || channel.name).toUpperCase()} · ${catalog.settings.rotation === 'random' ? 'RANDOM STREAM' : 'IN ORDER'}`;
  renderStreamSettings();
  $('bumpers').checked = catalog.settings.bumpers;
}

function renderGuide() {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const schedule = buildSchedule(catalog), position = schedulePosition(schedule, catalog.epoch);
  const list = $('guide-list'); list.replaceChildren();
  $('tune-live').disabled = $('standby-play').disabled = !position;
  if (!position) {
    list.append(element('p', 'This channel is waiting for its first checked episode. Add an Archive item or play a YouTube video to check its source and runtime.', 'empty'));
    $('rotation-note').textContent = 'Tubi links and YouTube playlists are available in the library, outside the live rotation.';
    if (!active) { $('playing-show').textContent = 'YOUR CHANNEL, YOUR COLLECTION'; $('playing-title').textContent = 'The next good thing starts with you.'; $('playing-detail').textContent = 'Add an episode source to begin.'; }
    return;
  }
  let startsAt = Date.now() / 1000 - position.offset;
  for (let i = 0; i < Math.min(4, schedule.length); i++) {
    const entry = schedule[(position.index + i) % schedule.length];
    const row = element('div', null, 'guide-row');
    const clock = i === 0 ? 'NOW' : new Date(startsAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    row.append(element('span', clock, 'guide-time'));
    const body = element('div', null, 'guide-copy');
    body.append(element('h3', entry.show.title), element('p', entry.episode.title), element('p', episodeDetail(entry.episode)));
    if (i === 0) {
      const track = element('div', null, 'guide-track'); const fill = element('span');
      fill.style.width = `${Math.min(100, position.offset / entry.duration * 100)}%`; track.append(fill); body.append(track);
    }
    row.append(body); list.append(row); startsAt += entry.duration;
  }
  const unique = new Set(schedule.map(entry => entry.episode.id)).size;
  $('rotation-note').textContent = `${unique} checked ${unique === 1 ? 'item' : 'items'} · ${catalog.settings.rotation === 'random' ? 'Random episodes, balanced show turns. Multipart stories stay together.' : 'Episodes in order within each show.'} Your station clock stays stable across refreshes.`;
  if (!active) {
    $('playing-show').textContent = position.current.show.title.toUpperCase();
    $('playing-title').textContent = position.current.episode.title;
    $('playing-detail').textContent = `${episodeDetail(position.current.episode)} · ${providerName[position.current.source.provider]}`;
  }
}

function renderLibrary() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const shows = channelShows().filter(s => s.title.toLocaleLowerCase().includes(query));
  const itemCount = channelShows().reduce((n, show) => n + show.episodes.length, 0);
  $('library-count').textContent = `${channelShows().length} shows & collections · ${itemCount} catalog episodes and items`;
  $('library-empty').hidden = shows.length > 0;
  $('library-grid').replaceChildren(...shows.map(s => {
    const card = element('article', null, 'show-card');
    const art = button('', () => openShow(s.id), 'show-art');
    art.style.setProperty('--tile', tiles[catalog.shows.indexOf(s) % tiles.length]);
    art.setAttribute('aria-label', `View episodes and sources for ${s.title}`);
    art.append(element('small', s.id === COMMERCIAL_SHOW_ID ? 'VINTAGE / COMMERCIALS' : s.channel === 'action' ? 'ACTION / ADVENTURE' : 'SATURDAY / MORNING'), element('strong', s.title));
    const count = s.episodes.length, live = s.episodes.filter(e => e.kind === 'episode' && stationSource(e) && e.durationSeconds > 0).length;
    let status = 'No episode sources yet · add yours';
    if (count) status = s.id === COMMERCIAL_SHOW_ID ? `${count} optional break clips · ${catalog.settings.bumpers ? 'enabled between stories' : 'off until enabled'}` : live ? `${live} in live rotation · ${count} catalog ${count === 1 ? 'item' : 'items'}` : `${count} ${count === 1 ? 'source item' : 'source items'} · watch from the library`;
    card.append(art, element('h3', s.title, 'show-title'), element('p', status, `show-status${live ? ' available' : ''}`));
    return card;
  }));
}

function render() { renderChannels(); renderGuide(); renderLibrary(); }

function openShow(showId) {
  selectedShowId = showId;
  const show = catalog.shows.find(s => s.id === showId);
  if (!show) return;
  $('show-title').textContent = show.title;
  $('show-shuffle').disabled = !show.episodes.some(episode => episode.kind === 'episode' && episode.durationSeconds > 0 && stationSource(episode));
  const imdb = $('show-imdb'); imdb.hidden = !show.imdbUrl;
  if (show.imdbUrl) imdb.href = show.imdbUrl;
  const rows = show.episodes.slice().sort((a, b) => a.season - b.season || a.number - b.number).map(e => {
    const row = element('article', null, 'episode-row');
    row.append(element('h3', e.title), element('p', episodeDetail(e), 'episode-meta'));
    const sources = element('div', null, 'sources');
    for (const source of e.sources) {
      const parsed = parseSourceUrl(source.url);
      if (source.provider === 'tubi') sources.append(link('Watch on Tubi ↗', source.url, 'button small'));
      else sources.append(button(`▶ ${providerName[source.provider]}${parsed.kind === 'playlist' ? ' playlist' : ''}`, () => {
        $('show-dialog').close(); playEpisode(show, e, source, 0, 'start'); $('watch').scrollIntoView();
      }));
      if (source.provider !== 'tubi') sources.append(link('Original ↗', source.url, 'button small'));
    }
    row.append(sources);
    const statuses = e.sources.map(s => `${providerName[s.provider]}: ${s.provider === 'tubi' ? 'opens on Tubi' : s.availability === 'verified' ? 'source checked; availability may change' : 'playback not checked'}`);
    row.append(element('p', statuses.join(' · ') || 'No sources attached', 'episode-meta'));
    const tools = element('div', null, 'episode-tools');
    tools.append(button('Edit details / add another source', () => openSource(show.id, e.id), 'text-button'));
    tools.append(button('Remove item', () => {
      const next = copyCatalog(); next.shows.find(s => s.id === show.id).episodes = show.episodes.filter(item => item.id !== e.id);
      if (commit(next)) { if (active?.episodeId === e.id) stopPlayer(); render(); openShow(show.id); notify('Item removed. Import a saved catalog to restore an exported copy.'); }
    }, 'text-button'));
    row.append(tools); return row;
  });
  $('show-episodes').replaceChildren(...(rows.length ? rows : [element('p', 'No matched episodes were found in the current public-source search. Add a source if you find another collection.', 'empty')]));
  if (!$('show-dialog').open) $('show-dialog').showModal();
}

function openSource(showId = selectedShowId, episodeId = null) {
  $('show-dialog').close(); editingEpisodeId = episodeId;
  const show = catalog.shows.find(s => s.id === showId) || channelShows()[0] || catalog.shows[0];
  selectedShowId = show.id;
  $('source-form').reset();
  $('source-show').replaceChildren(...catalog.shows.map(s => { const option = element('option', s.title); option.value = s.id; return option; }));
  $('source-show').value = show.id;
  $('source-show').disabled = Boolean(episodeId);
  $('source-imdb').value = show.imdbUrl || '';
  const e = show.episodes.find(e => e.id === episodeId);
  if (e) {
    $('source-title').value = e.title;
    $('source-season').value = e.season;
    $('source-number').value = e.number;
    $('source-duration').value = e.durationSeconds ? e.durationSeconds / 60 : '';
    $('source-group').value = e.group;
    $('source-bumper').checked = e.kind === 'bumper';
    $('source-url').required = false;
    $('source-url').placeholder = 'Optional: add an alternative source';
  } else {
    $('source-bumper').checked = show.id === COMMERCIAL_SHOW_ID;
    $('source-number').value = show.episodes.length + 1;
    $('source-url').required = true;
    $('source-url').placeholder = 'https://archive.org/details/…';
  }
  $('source-error').hidden = true;
  $('source-heading').textContent = e ? 'Fine-tune this episode.' : 'Bring your favorites.';
  $('save-source').textContent = e ? 'Save details' : 'Add source';
  $('source-dialog').showModal();
}

function stopPlayer() {
  playerGeneration++; session?.dispose(); session = null; active = null; scrubbing = false; scrubSession = null;
  renderTransport();
  $('player-host').replaceChildren(); $('standby').hidden = false;
  $('player-error').hidden = true; $('original-link').hidden = true;
  $('playback-state').textContent = 'READY TO TUNE';
}

function playerError(message, generation) {
  if (generation !== playerGeneration) return;
  $('player-error-text').textContent = message;
  $('player-error').hidden = false;
  $('playback-state').textContent = 'PLAYBACK NEEDS ATTENTION';
}

function playEpisode(show, episode, source, offset = 0, mode = 'start', queueMode = mode === 'live' ? 'station' : 'show', queuePosition = null) {
  stopPlayer();
  const generation = playerGeneration;
  retroEffects.pulse();
  active = { showId: show.id, episodeId: episode.id, sourceId: source.id, offset, mode, queueMode, queuePosition };
  $('standby').hidden = true;
  $('playing-show').textContent = show.title.toUpperCase();
  $('playing-title').textContent = episode.title;
  $('playing-detail').textContent = `${episodeDetail(episode)} · ${mode === 'live' ? 'Station clock · best-effort sync' : 'From the beginning'} · ${providerName[source.provider]}`;
  $('original-link').href = $('error-original').href = source.url;
  $('original-link').hidden = false;
  $('playback-state').textContent = 'LOADING SOURCE';
  const verified = duration => {
    if (generation !== playerGeneration || !Number.isFinite(duration) || duration <= 0 || duration > 86400) return;
    if (source.provider === 'youtube') $('playback-state').textContent = 'PLAYING · YOUTUBE';
    const isPlaylist = parseSourceUrl(source.url).kind === 'playlist';
    const next = copyCatalog(); const e = next.shows.find(s => s.id === show.id)?.episodes.find(e => e.id === episode.id);
    const src = e?.sources.find(s => s.id === source.id);
    if (!e || !src || ((isPlaylist || Math.abs((e.durationSeconds || 0) - duration) < 1) && src.availability === 'verified')) return;
    if (!isPlaylist) e.durationSeconds = duration;
    src.availability = 'verified';
    if (commit(next)) {
      $('playing-detail').textContent = `${episodeDetail(e)} · ${active.mode === 'live' ? 'Station clock · best-effort sync' : 'From the beginning'} · ${providerName[source.provider]}`;
      renderGuide(); renderLibrary();
    }
  };
  const ended = () => { if (generation === playerGeneration) advance(false); };
  const error = message => playerError(message, generation);
  if (source.provider === 'archive') {
    const video = element('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata';
    video.setAttribute('aria-label', `${show.title}: ${episode.title}`);
    $('player-host').append(video);
    session = createVideoSession(video, { url: source.url, offset, onVerified: verified, onEnd: ended, onError: error });
    video.addEventListener('playing', () => { if (generation === playerGeneration) { $('playback-state').textContent = 'PLAYING · ARCHIVE'; $('player-error').hidden = true; } });
    video.addEventListener('pause', () => { if (generation === playerGeneration) $('playback-state').textContent = 'PAUSED'; });
    session.play();
  } else if (source.provider === 'youtube') {
    const holder = element('div'); $('player-host').append(holder);
    session = createYouTubeSession(holder, { source, offset, origin: location.origin, onVerified: verified, onEnd: ended, onError: error,
      onState: state => {
        if (generation !== playerGeneration) return;
        if (state === 1) { $('playback-state').textContent = 'PLAYING · YOUTUBE'; $('player-error').hidden = true; }
        if (state === 2) $('playback-state').textContent = 'PAUSED';
        if (state === 3) $('playback-state').textContent = 'BUFFERING';
      } });
  } else {
    const box = element('div', null, 'external-player');
    box.append(element('h3', 'This one’s on Tubi.'), element('p', 'Watch this episode on its original Tubi page. It stays outside your station’s continuous playback.'), link('Watch on Tubi ↗', source.url, 'button primary'));
    $('player-host').append(box); $('playback-state').textContent = 'OPENS ON TUBI';
  }
  renderGuide();
}

function tuneLive() {
  const queue = buildSchedule(catalog), p = schedulePosition(queue, catalog.epoch);
  if (p) playEpisode(p.current.show, p.current.episode, p.current.source, p.offset, 'live', 'station', { index: p.index, previousId: queue[(p.index - 1 + queue.length) % queue.length].episode.id });
  else openSource();
}
function markTimeShift() {
  if (!active) return;
  active.mode = 'start';
  const show = catalog.shows.find(s => s.id === active.showId), episode = show?.episodes.find(e => e.id === active.episodeId);
  const source = episode?.sources.find(s => s.id === active.sourceId);
  if (episode && source) $('playing-detail').textContent = `${episodeDetail(episode)} · Watching on your time · ${providerName[source.provider]}`;
}
function seekVideo(seconds) {
  if (session?.seek(seconds)) { if (active) active.offset = Math.max(0, Math.min(seconds, transportState()?.duration ?? seconds)); markTimeShift(); renderTransport(); return true; }
  return false;
}
function startOver() { if (seekVideo(0)) session?.play(); }
function advance(manual, direction = 1) {
  if (!active) return;
  if (manual && session?.navigatePlaylist?.(direction)) { renderTransport(); return; }
  const entry = adjacentPlayback(catalog, active, direction);
  if (!entry || (manual && entry.episode.id === active.episodeId)) {
    if (manual) notify(direction < 0 ? 'You are at the first playable episode in this queue.' : 'There isn’t another playable episode in this queue.');
    else $('playback-state').textContent = 'FINISHED';
    return;
  }
  const queueMode = active.queueMode;
  playEpisode(entry.show, entry.episode, entry.source, 0, 'start', queueMode, entry.queuePosition);
}

function transportState() { try { return session?.getState(); } catch { return null; } }
function showPosition(seconds, duration) {
  const text = `${playbackTime(seconds)} out of ${playbackTime(duration)}`;
  if ($('video-time').textContent !== text) $('video-time').textContent = text;
  $('video-seek').setAttribute('aria-valuetext', text);
}
function renderTransport() {
  let state = transportState();
  const ready = !!state?.ready;
  if (ready && audioSession !== session) {
    audioSession = session;
    if (preferredAudio) { session.setVolume(preferredAudio.volume); session.setMuted(preferredAudio.muted); audioLockUntil = Date.now() + 750; }
    state = transportState();
  }
  if (ready && Date.now() >= audioLockUntil) preferredAudio = { volume: state.volume, muted: state.muted };
  if (ready && active && Number.isFinite(state.currentTime)) active.offset = state.currentTime;
  const seekable = ready && Number.isFinite(state.duration) && state.duration > 0;
  for (const id of ['toggle-play', 'video-mute', 'video-volume']) $(id).disabled = !ready;
  for (const id of ['video-seek', 'rewind-ten', 'forward-ten', 'start-over']) $(id).disabled = !seekable;
  $('toggle-play').textContent = ready && !state.paused ? '❚❚ Pause' : '▶ Play';
  $('toggle-play').setAttribute('aria-label', ready && !state.paused ? 'Pause video' : 'Play video');
  if (!scrubbing) {
    $('video-seek').max = seekable ? String(state.duration) : '1';
    $('video-seek').value = seekable ? String(state.currentTime) : '0';
    showPosition(state?.currentTime || 0, state?.duration ?? null);
  }
  const audio = preferredAudio && Date.now() < audioLockUntil ? preferredAudio : state;
  const percent = audio?.muted ? 0 : Math.round((audio?.volume ?? 1) * 100);
  if (document.activeElement !== $('video-volume')) $('video-volume').value = String(percent);
  $('video-volume-value').textContent = `${percent}%`;
  $('video-mute').textContent = audio?.muted ? 'Unmute' : 'Mute';
  $('video-mute').setAttribute('aria-label', audio?.muted ? 'Unmute video' : 'Mute video');
  $('video-mute').setAttribute('aria-pressed', String(!!audio?.muted));
  if (navCatalog !== catalog || navActive !== active) {
    navCatalog = catalog; navActive = active;
    previousEntry = adjacentPlayback(catalog, active, -1); nextEntry = adjacentPlayback(catalog, active, 1);
  }
  $('previous-episode').disabled = state?.playlist ? !ready : !previousEntry || previousEntry.episode.id === active?.episodeId;
  $('skip').disabled = state?.playlist ? !ready : !nextEntry || nextEntry.episode.id === active?.episodeId;
}
$('toggle-play').addEventListener('click', () => { const state = transportState(); if (state?.ready) { if (state.paused) session.play(); else session.pause(); } renderTransport(); });
$('rewind-ten').addEventListener('click', () => seekVideo((transportState()?.currentTime || 0) - 10));
$('forward-ten').addEventListener('click', () => seekVideo((transportState()?.currentTime || 0) + 10));
$('previous-episode').addEventListener('click', () => advance(true, -1));
$('video-seek').addEventListener('input', () => { scrubbing = true; scrubSession = session; showPosition(Number($('video-seek').value), transportState()?.duration ?? null); });
$('video-seek').addEventListener('change', () => { const value = Number($('video-seek').value); const same = scrubSession === session; scrubbing = false; scrubSession = null; if (same) seekVideo(value); renderTransport(); });
$('video-seek').addEventListener('pointercancel', () => { scrubbing = false; scrubSession = null; renderTransport(); });
$('video-volume').addEventListener('input', () => {
  const volume = Number($('video-volume').value) / 100;
  preferredAudio = { volume, muted: volume === 0 }; audioLockUntil = Date.now() + 750;
  session?.setVolume(volume); renderTransport();
});
$('video-mute').addEventListener('click', () => {
  const state = transportState(); if (!state?.ready) return;
  const muted = !(preferredAudio && Date.now() < audioLockUntil ? preferredAudio.muted : state.muted);
  preferredAudio = { volume: state.volume > 0 ? state.volume : 1, muted };
  if (!muted && !state.volume) session.setVolume(1);
  session.setMuted(muted); audioLockUntil = Date.now() + 750; renderTransport();
});
renderTransport();
setInterval(renderTransport, 250);

$('source-form').addEventListener('submit', async event => {
  event.preventDefault(); if (importBusy) return;
  $('source-error').hidden = true;
  const showId = $('source-show').value, episodeId = editingEpisodeId;
  const raw = $('source-url').value.trim(), title = $('source-title').value.trim();
  const season = Number($('source-season').value), number = Number($('source-number').value);
  const minutes = $('source-duration').value.trim();
  const runtime = minutes ? parseDuration(Number(minutes) * 60) : null;
  const group = $('source-group').value.trim(), kind = $('source-bumper').checked ? 'bumper' : 'episode';
  const imdbUrl = $('source-imdb').value.trim() || null;
  importBusy = true; $('save-source').disabled = true; $('save-source').textContent = 'Checking source…';
  try {
    if (minutes && !runtime) throw Error('Enter a runtime between 0 and 1,440 minutes, or leave it unknown.');
    const parsed = raw ? parseSourceUrl(raw) : null;
    let imported;
    if (parsed?.provider === 'archive' && parsed.kind === 'item') imported = await importArchive(raw);
    // Read the latest catalog after an asynchronous source fetch, so other edits are not discarded.
    const next = copyCatalog(), show = next.shows.find(s => s.id === showId);
    if (!show) throw Error('That show is no longer in the catalog.');
    show.imdbUrl = imdbUrl;
    if (episodeId) {
      const e = show.episodes.find(e => e.id === episodeId);
      if (!e) throw Error('That episode is no longer in the catalog.');
      if (imported) throw Error('Import Archive collections as new items; use a direct MP4 URL for an alternative source.');
      e.title = title; e.season = season; e.number = number; e.durationSeconds = runtime; e.group = group; e.kind = kind;
      if (parsed && !e.sources.some(s => s.url === parsed.url)) e.sources.push({ id: uid('source'), provider: parsed.provider, url: parsed.url, availability: 'unverified' });
    } else {
      const incoming = imported || [{ id: uid('episode'), title: title || (parsed.provider === 'youtube' ? `YouTube ${parsed.kind} · ${parsed.videoId || parsed.playlistId}` : 'Source title not checked'),
        season, number, durationSeconds: runtime, group, kind,
        sources: [{ id: uid('source'), provider: parsed.provider, url: parsed.url, availability: 'unverified' }] }];
      const knownUrls = new Set(show.episodes.flatMap(e => e.sources.map(s => s.url)));
      let added = 0;
      for (const e of incoming) {
        if (e.sources.some(s => knownUrls.has(s.url))) continue;
        e.id = uid('episode');
        if (imported) { e.group = group; e.kind = kind; if (incoming.length === 1 && title) e.title = title; }
        show.episodes.push(e); e.sources.forEach(s => knownUrls.add(s.url)); added++;
      }
      if (!added) throw Error('Those sources are already in this show. No duplicate items were added.');
    }
    validateCatalog(next);
    if (!commit(next)) throw Error('The source was not saved. Check the storage message above.');
    $('source-dialog').close(); notify(episodeId ? 'Episode details saved.' : 'Source added. Open the show to watch or check playback.'); render(); openShow(showId);
  } catch (error) { $('source-error').textContent = error.message; $('source-error').hidden = false; }
  finally { importBusy = false; $('save-source').disabled = false; $('save-source').textContent = editingEpisodeId ? 'Save details' : 'Add source'; }
});

$('source-show').addEventListener('change', () => {
  const show = catalog.shows.find(s => s.id === $('source-show').value);
  if (show) { $('source-imdb').value = show.imdbUrl || ''; $('source-number').value = show.episodes.length + 1; $('source-bumper').checked = show.id === COMMERCIAL_SHOW_ID; }
});
for (const id of ['manage-sources', 'guide-add']) $(id).addEventListener('click', () => openSource());
$('show-add').addEventListener('click', () => openSource(selectedShowId));
$('close-show').addEventListener('click', () => $('show-dialog').close());
for (const id of ['close-source', 'cancel-source']) $(id).addEventListener('click', () => { if (!importBusy) $('source-dialog').close(); });
$('source-dialog').addEventListener('cancel', event => { if (importBusy) event.preventDefault(); });
$('search').addEventListener('input', renderLibrary);
for (const id of ['tune-live', 'standby-play']) $(id).addEventListener('click', tuneLive);
$('start-over').addEventListener('click', startOver);
for (const id of ['skip', 'skip-error']) $(id).addEventListener('click', () => advance(true));
$('retry').addEventListener('click', () => {
  if (!active) return;
  const show = catalog.shows.find(s => s.id === active.showId), episode = show?.episodes.find(e => e.id === active.episodeId);
  const source = episode?.sources.find(s => s.id === active.sourceId);
  if (source) playEpisode(show, episode, source, active.offset, active.mode, active.queueMode, active.queuePosition);
});
$('bumpers').addEventListener('change', () => {
  const enabled = $('bumpers').checked;
  const next = copyCatalog(); next.settings.bumpers = enabled;
  if (commit(next)) {
    render(); renderTransport();
    notify(enabled ? 'Vintage commercials and checked bumpers enabled between complete stories. Use Next to skip a break.' : 'Upcoming commercial breaks and bumpers are off. Current playback is unchanged.');
  } else $('bumpers').checked = catalog.settings.bumpers;
});
$('export-catalog').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' }));
  const a = element('a'); a.href = url; a.download = 'yata-catalog.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('import-catalog').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw Error('Import exceeds the 2 MB catalog limit.');
    const next = parseCatalogJson(await file.text());
    if (!commit(next)) return;
    stopPlayer(); selectedShowId = catalog.shows[0].id; render(); notify('Catalog imported and saved.');
  } catch (error) { notify(`${error.message} Your previous catalog is unchanged.`); }
  finally { event.target.value = ''; }
});

render();
if (loaded.error) notify(loaded.error);
setInterval(renderGuide, 15000);
window.addEventListener('pagehide', () => session?.dispose());

let batchRows = [], batchPage = 0, batchFilter = '', wholeLibrary = false;
$('bulk-open').addEventListener('click', () => {
  $('bulk-show').replaceChildren(...catalog.shows.map(show => { const option = element('option', show.title); option.value = show.id; return option; }));
  $('bulk-show').value = selectedShowId;
  $('bulk-dialog').showModal();
});
$('bulk-close').addEventListener('click', () => $('bulk-dialog').close());
$('bulk-discover').addEventListener('click', async () => {
  const links = $('bulk-links').value.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (!links.length || links.length > 10) { $('bulk-status').textContent = 'Enter 1–10 source links.'; return; }
  const showId = $('bulk-show').value;
  wholeLibrary = false; batchPage = 0; batchFilter = ''; $('bulk-coverage').replaceChildren();
  $('bulk-discover').disabled = true; $('bulk-all').disabled = true; $('bulk-starter').disabled = true; $('bulk-transformers').disabled = true; $('bulk-close').disabled = true; $('bulk-approve').hidden = true;
  $('bulk-preview').replaceChildren(); batchRows = [];
  const errors = [];
  try {
    for (const [index, raw] of links.entries()) {
      $('bulk-status').textContent = `Discovering source ${index + 1} of ${links.length}…`;
      try {
        const parsed = parseSourceUrl(raw);
        let episodes;
        if (parsed.provider === 'archive' && parsed.kind === 'item') episodes = await importArchive(raw);
        else if (parsed.provider === 'youtube') {
          if (staticHosting) throw Error('This hosted station has no YouTube discovery server. Use Add an episode source for an official YouTube video/playlist, or expand a playlist locally and import its exported catalog. The complete seeded library is available through Load all discovered shows.');
          const response = await fetch(new URL(`api/youtube?url=${encodeURIComponent(parsed.url)}`, document.baseURI));
          const data = await response.json();
          if (!response.ok) throw Error(data.error || 'YouTube discovery failed.');
          episodes = data.episodes;
        } else throw Error('Bulk discovery supports Archive item and YouTube links. Add Tubi links individually.');
        if (batchRows.length + episodes.length > 1000) throw Error('This batch exceeds 1,000 episodes. Use smaller batches.');
        batchRows.push(...episodes.map(episode => ({ selected: true, showId, episode })));
      } catch (error) { errors.push(`Source ${index + 1}: ${error.message}`); }
    }
    renderBatch();
    $('bulk-status').textContent = `${batchRows.length} episodes ready to review. Duplicate URLs are skipped on approval. ${errors.join(' ')}`;
    $('bulk-approve').hidden = !batchRows.length;
  } finally { $('bulk-discover').disabled = false; $('bulk-all').disabled = false; $('bulk-starter').disabled = false; $('bulk-transformers').disabled = false; $('bulk-close').disabled = false; }
});
$('bulk-approve').addEventListener('click', () => {
  try {
    const result = wholeLibrary ? mergeLibraryBatch(libraryBase(), batchRows) : mergeBatch(catalog, batchRows);
    if (!commit(result.catalog)) return;
    batchRows = []; $('bulk-pages').replaceChildren(); $('bulk-preview').replaceChildren(); $('bulk-approve').hidden = true;
    $('bulk-status').textContent = `Added ${result.added} ${result.added === 1 ? 'episode' : 'episodes'}; skipped ${result.skipped} duplicates.${result.alternatives ? ` Added ${result.alternatives} alternative sources to existing episodes.` : ''}`;
    render();
  } catch (error) { $('bulk-status').textContent = error.message; }
});

function renderBatch() {
  $('bulk-preview').replaceChildren();
  const filtered = batchRows.filter(row => !batchFilter || row.showId === batchFilter);
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  batchPage = Math.max(0, Math.min(batchPage, pages - 1));
  $('bulk-pages').replaceChildren(
    button('← Previous 50', () => { batchPage--; renderBatch(); }),
    element('span', `${filtered.length} candidates · page ${batchPage + 1} of ${pages}`),
    button('Next 50 →', () => { batchPage++; renderBatch(); })
  );
  $('bulk-pages').firstChild.disabled = batchPage === 0;
  $('bulk-pages').lastChild.disabled = batchPage === pages - 1;
  for (const row of filtered.slice(batchPage * 50, (batchPage + 1) * 50)) {
      const box = element('fieldset', null, 'bulk-row');
      const include = element('input'); include.type = 'checkbox'; include.checked = row.selected;
      const label = element('label', 'Include episode'); label.prepend(include); box.append(label);
      include.addEventListener('change', () => { row.selected = include.checked; });
      const select = element('select'); select.setAttribute('aria-label', 'Episode show');
      for (const show of catalog.shows) { const o = element('option', show.title); o.value = show.id; select.append(o); }
      select.value = row.showId; select.addEventListener('change', () => { row.showId = select.value; }); box.append(select);
      for (const [key, caption, type] of [['title','Title','text'], ['season','Season','number'], ['number','Episode','number'], ['group','Multipart group','text']]) {
        const field = element('label', caption), input = element('input'); input.type = type; input.value = row.episode[key];
        if (type === 'number') { input.min = '0'; input.step = '1'; }
        input.addEventListener('input', () => { row.episode[key] = type === 'number' ? Number(input.value) : input.value; });
        field.append(input); box.append(field);
      }
      box.append(element('p', `${row.episode.durationSeconds ? timeLabel(row.episode.durationSeconds) : 'Runtime unknown'} · ${row.episode.sources[0].provider === 'youtube' ? 'Needs playback check before live rotation' : 'Archive metadata checked'}`, 'muted'), link('Original source ↗', row.episode.sources[0].url));
      $('bulk-preview').append(box);
    }

}
$('bulk-starter').addEventListener('click', () => {
  wholeLibrary = false; batchPage = 0; batchFilter = ''; $('bulk-coverage').replaceChildren();
  batchRows = STARTER_PACK.map(item => {
    const episode = youtubeEpisodes(item)[0];
    return { selected: true, showId: item.showId, episode };
  });
  renderBatch(); $('bulk-approve').hidden = false;
  $('bulk-status').textContent = 'Five official-channel episode candidates. Review titles and order before adding. YouTube playback still needs checking; season 0 means unknown.';
});
$('bulk-transformers').addEventListener('click', () => {
  $('bulk-show').value = 'transformers';
  $('bulk-links').value = 'https://www.youtube.com/playlist?list=PLD3dCMp2WHixUHTv2TETDETzoB148KoPy';
  $('bulk-status').textContent = 'Official Hasbro Pulse collection selected. Choose Discover episodes, then review episode order before adding.';
});

async function loadWholeLibrary() {
  $('bulk-status').textContent = 'Loading discovered episodes for every show…';
  $('bulk-all').disabled = true; $('bulk-discover').disabled = true; $('bulk-starter').disabled = true; $('bulk-approve').hidden = true;
  try {
    const { packs } = await fetchLibrary();
    batchRows = discoveryRows(libraryBase(), packs); wholeLibrary = true; batchPage = 0; batchFilter = '';
    const filterLabel = element('label', 'Review a show');
    const filter = element('select'); const all = element('option', 'All shows'); all.value = ''; filter.append(all);
    const coverage = element('div', null, 'coverage-grid');
    for (const show of catalog.shows) {
      const rows = batchRows.filter(row => row.showId === show.id);
      const option = element('option', `${show.title} · ${rows.length} candidates`); option.value = show.id; filter.append(option);
      const box = element('div', null, 'coverage-show'); const include = element('input'); include.setAttribute('aria-label', `Include ${show.title}`); include.type = 'checkbox'; include.checked = !!rows.length; include.disabled = !rows.length;
      include.addEventListener('change', () => { rows.forEach(row => { row.selected = include.checked; }); renderBatch(); });
      box.append(include, element('span', `${show.title} · ${rows.length ? `${rows.length} candidates` : 'No matched public MP4/official YouTube episodes found'}`));
      const notes = packs.flatMap(pack => pack.shows.filter(s => s.showId === show.id).flatMap(s => s.notes || []));
      if (notes.length) { const details = element('details'); details.append(element('summary', 'Search notes'), element('p', notes.join(' '), 'muted')); box.append(details); }
      coverage.append(box);
    }
    filter.addEventListener('change', () => { batchFilter = filter.value; batchPage = 0; renderBatch(); }); filterLabel.append(filter);
    $('bulk-coverage').replaceChildren(element('p', 'Select shows to include, then review episode details below. Counts are source candidates; matching titles and explicit season/episode pairs will combine alternative sources. Unknown ordering stays separate.', 'muted'), filterLabel, coverage);
    renderBatch(); $('bulk-approve').hidden = !batchRows.length;
    const found = new Set(batchRows.map(row => row.showId)).size;
    $('bulk-status').textContent = `${batchRows.length} source candidates across ${found} shows. Review and add selected episodes. Archive metadata is checked; YouTube playback still needs checking. Search limits and gaps are recorded below.`;
  } catch (error) { $('bulk-status').textContent = error.message; }
  finally { $('bulk-all').disabled = false; $('bulk-discover').disabled = false; $('bulk-starter').disabled = false; }
}
$('bulk-all').addEventListener('click', loadWholeLibrary);
$('seed-all').addEventListener('click', () => { $('bulk-open').click(); loadWholeLibrary(); });

function libraryBase() {
  const base = copyCatalog();
  for (const show of createSeed().shows) if (!base.shows.some(existing => existing.id === show.id)) base.shows.push({ ...show, episodes: [] });
  return base;
}
const LIBRARY_REVISION_KEY = 'drew-tv.library-revision.v1';
async function fetchLibrary() {
  const response = await fetch('data/library-manifest.json');
  if (!response.ok) throw Error('The expanded episode library is not ready yet.');
  const manifest = await response.json();
  if (typeof manifest.revision !== 'string' || !/^[a-z0-9.-]{1,100}$/.test(manifest.revision)) throw Error('Invalid library revision.');
  const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials'].map(async provider => {
    const response = await fetch(`data/${provider}-discovery.json`);
    if (!response.ok) throw Error('A library source file could not be loaded. Your catalog is unchanged.');
    return response.json();
  }));
  return { manifest, packs };
}
async function installExpandedLibrary() {
  // A damaged saved catalog must remain recoverable instead of being overwritten.
  if (loaded.error) return;
  try {
    const { manifest, packs } = await fetchLibrary();
    if (storage.getItem(LIBRARY_REVISION_KEY) === manifest.revision) return;
    const base = libraryBase();
    const rows = discoveryRows(base, packs);
    const result = mergeLibraryBatch(base, rows);
    if (!commit(result.catalog)) return;
    try { storage.setItem(LIBRARY_REVISION_KEY, manifest.revision); } catch { /* Repeat imports remain additive and URL-deduplicated. */ }
    render();
    if ($('show-dialog').open) openShow(selectedShowId);
    notify(`Expanded library added: ${result.added} episodes and ${result.alternatives} alternative sources. Existing sources and settings were preserved. YouTube entries still need a playback check.`);
  } catch (error) { notify(`Expanded library could not be added: ${error.message}`); }
}
installExpandedLibrary();

if (staticHosting) {
  $('bulk-transformers').hidden = true;
  const note = element('p', 'This hosted station supports the curated library and Archive bulk discovery. Add YouTube videos or playlists through Manage sources; expanding a new YouTube playlist into individual episodes requires the local importer.', 'muted');
  $('bulk-links').parentElement.before(note);
}

function renderStreamSettings() {
  $('stream-rotation').value = catalog.settings.rotation;
  const all = element('option', catalog.settings.channel === 'mixed' ? 'Any show · everything' : `Any show · ${selectedChannel().name}`); all.value = '';
  $('stream-show').replaceChildren(all, ...channelShows().map(show => {
    const count = show.episodes.filter(episode => episode.kind === 'episode' && episode.durationSeconds > 0 && stationSource(episode)).length;
    const option = element('option', `${show.title} · ${count} checked`); option.value = show.id; option.disabled = !count; return option;
  }));
  $('stream-show').value = catalog.settings.streamShow || '';
  $('stream-run').value = String(catalog.settings.storiesPerTurn);
  $('stream-run').disabled = catalog.settings.rotation !== 'random' || !!catalog.settings.streamShow;
  $('stream-reshuffle').disabled = catalog.settings.rotation !== 'random';
  const title = catalog.shows.find(show => show.id === catalog.settings.streamShow)?.title;
  $('stream-description').textContent = catalog.settings.rotation === 'random'
    ? title ? `Random ${title} episodes, continuously. Each story plays before its pool repeats.`
      : `Random episodes from random shows · ${catalog.settings.storiesPerTurn} ${catalog.settings.storiesPerTurn === 1 ? 'story' : 'stories'} per show turn. Smaller libraries keep their turn; multipart stories stay together.`
    : `${title || 'All shows in this channel'} in episode order. Switch to random for a shuffled stream.`;
}
function configureStream(patch, play = false) {
  const wasPlaying = transportState()?.paused === false;
  const next = copyCatalog(); Object.assign(next.settings, patch); next.epoch = Date.now() / 1000;
  if (!commit(next)) { renderStreamSettings(); return false; }
  stopPlayer(); render();
  if (play || wasPlaying) tuneLive();
  return true;
}
function newMix() { return Number.parseInt(crypto.randomUUID().slice(0, 8), 16); }
$('stream-rotation').addEventListener('change', () => configureStream({ rotation: $('stream-rotation').value }));
$('stream-show').addEventListener('change', () => configureStream({ streamShow: $('stream-show').value || null }));
$('stream-run').addEventListener('change', () => configureStream({ storiesPerTurn: Number($('stream-run').value) }));
$('stream-reshuffle').addEventListener('click', () => configureStream({ rotation: 'random', shuffleSeed: newMix() }, true));
$('show-shuffle').addEventListener('click', () => {
  const show = catalog.shows.find(show => show.id === selectedShowId); if (!show) return;
  $('show-dialog').close();
  configureStream({ channel: show.channel, streamShow: show.id, rotation: 'random', shuffleSeed: newMix() }, true);
  $('watch').scrollIntoView();
});

mountWindowMode({ documentRef: document, screen: $('screen-column'), toggle: $('fill-window'), closeButton: $('exit-window') });

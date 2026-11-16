import {scheduleEpoch,remixLineups,mountLineupRemix} from './remix.mjs';
import {installArcadeEntry} from './arcade-entry.mjs';
installArcadeEntry();
import {mountMixControls} from './mix-controls.mjs';
import {mountSeekVisibility} from './seek-visibility.mjs';
import {mountChannelBuilder} from './channel-builder-ui.mjs';
import {mountTvGuide} from './tv-guide-ui.mjs';
import {guidePlayback} from './tv-guide.mjs';
import { fetchPublishedCatalog, mergePublishedCatalog } from './published-catalog.mjs';
import { openCatalogStore, CatalogConflict } from './catalog-store.mjs';
import { excludeEpisode, excludeSource, restoreExcluded } from './exclusions.mjs';
import { MOVIE_SHOW_ID } from './collections.mjs';
import { mountDialFeedback } from './dial-feedback.mjs';
import { availableDialShows, nextDialShow, randomDialPatch } from './dials.mjs';
import { createEpisodeLink, parseEpisodeLink, findSharedEpisode } from './share.mjs';
import { markCommercialPreference } from './preferences.mjs';
import { mountRetroEffects } from './retro-effects.mjs';
import { mountWindowMode } from './window-mode.mjs';
import { playbackTime, adjacentPlayback, playbackPosition } from './transport.mjs';
import { STARTER_PACK } from './starter-pack.mjs';
import { youtubeEpisodes, mergeBatch, mergeLibraryBatch, discoveryRows, extendLibraryCatalog } from './bulk.mjs';
import { CHANNELS, createSeed } from './catalog.mjs';
import { parseSourceUrl, parseDuration, importArchive, validateCatalog, parseCatalogJson,
  readCatalog, buildSchedule, schedulePosition, stationSource, timeLabel, MAX_IMPORT_BYTES, COMMERCIAL_SHOW_ID, STORAGE_KEY } from './domain.mjs';
import { createVideoSession, createYouTubeSession } from './players.mjs';

const $ = id => document.getElementById(id);
const staticHosting = document.querySelector('meta[name="drew-tv-hosting"]')?.content === 'static';
const ownerMode = !staticHosting && ['127.0.0.1','localhost','[::1]'].includes(location.hostname);
document.body.classList.toggle('public-view', !ownerMode);
document.body.classList.toggle('public-catalog-pending', !ownerMode);
let publicCatalogReady=false;
const storage = { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v) };
let hadSavedCatalog = true;
try { hadSavedCatalog = storage.getItem(STORAGE_KEY) !== null; } catch { /* Preserve an unreadable owner draft. */ }
const retroEffects = mountRetroEffects({ body: document.body, shell: $('player-shell'), cabinet: $('tv-cabinet'), screenToggle: $('crt-look'), staticToggle: $('tuning-static'), themeSelect: $('tv-theme'), levelInput: $('static-level'), durationInput: $('static-duration'), modeSelect: $('static-mode'), previewButton: $('static-preview'), levelOutput: $('static-level-value'), durationOutput: $('static-duration-value'), storage });
const DIAL_MODE_STORAGE_KEY = 'yata.dial-mode.v1';
let dialMode = 'channel';
try { const saved = storage.getItem(DIAL_MODE_STORAGE_KEY); if (['channel', 'show', 'all'].includes(saved)) dialMode = saved; } catch { /* Tuning still works without preference storage. */ }
const VIEWER_SETTINGS_KEY='yata.viewer-settings.v1';
let viewerPreferences=null;
const catalogStore = ownerMode ? await openCatalogStore({storage,seed:createSeed()}) : openViewerCatalog();
const loaded = catalogStore.loaded;
let catalog = catalogStore.catalog;
let publisherReview = null, publisherCsrf = null, publicationUi = null, publishedBusy = false;
let rejectedCatalog = null, lastSaveError = '', unsavedChanges = false, pendingWrites = 0;
let selectedShowId = catalog.shows[0].id, editingEpisodeId = null;
let session = null, active = null, playerGeneration = 0, importBusy = false;
let scrubbing = false, scrubSession = null, audioSession = null, preferredAudio = null, audioLockUntil = 0;
let navCatalog = null, navActive = null, previousEntry = null, nextEntry = null;
let sharedTarget = null;
const providerName = { archive: 'Internet Archive', youtube: 'YouTube', tubi: 'Tubi', adultswim: 'Adult Swim' };
const tiles = ['#5c6242', '#76513b', '#4d6152', '#755d36', '#665841', '#526044', '#704d3d', '#4f635a'];
const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const dialFeedback = mountDialFeedback({ windowRef: window, storage, toggle: $('dial-feedback'), getVolume: () => transportState()?.volume ?? preferredAudio?.volume ?? 1, getMuted: () => transportState()?.muted ?? preferredAudio?.muted ?? false, pulse: () => retroEffects.pulse({ force: true }) });

const mixControls=mountMixControls({root:$('mix-panel'),channels:CHANNELS,getSettings:()=>catalog.settings,onChange:async ids=>{const next=copyCatalog(),main=next.settings.channel==='mixed'&&!next.settings.streamShow&&!next.settings.streamShows,playing=transportState()?.paused===false;if(ids.length===CHANNELS.length-1)delete next.settings.mixChannels;else next.settings.mixChannels=ids;if(main){next.epoch=Date.now()/1000;if(next.settings.channelRemixes?.mixed)next.settings.channelRemixes.mixed.epoch=next.epoch;}if(await commitSettings(next)){if(main)stopPlayer();render();if(main&&playing)tuneLive();return true;}return false;}});
mountLineupRemix({root:$('remix-panel'),channels:CHANNELS,getChannel:()=>catalog.settings.channel,onRemix:async channel=>{
 if(!ownerMode&&!publicCatalogReady)return false;
 const current=channel==='all'||channel===catalog.settings.channel,playing=transportState()?.paused===false;
 if(!await commitSettings(remixLineups(catalog,channel)))return false;
 if(current)stopPlayer();render();if(current&&playing)tuneLive();return true;
}});
mountSeekVisibility({transport:document.querySelector('.transport[aria-label="Video playback controls"]'),panel:$('seek-panel'),toggle:$('toggle-seek-panel'),select:$('seek-visibility'),storage});

let guideJumpPending=location.hash==='#guide';
const stationGuide=mountTvGuide({root:$('guide'),getCatalog:()=>catalog,isReady:()=>ownerMode||publicCatalogReady,onTune:selection=>playFromGuide(selection,true),onPlay:selection=>playFromGuide(selection,false)});
function showBrowseView(view,{scroll=false}={}) {
  const guide=view==='guide';document.body.classList.toggle('guide-view',guide);$('guide').hidden=!guide;$('library').hidden=guide;
  if(!guide)guideJumpPending=false;
  for(const name of ['guide','library']){const tab=$(name+'-tab'),selected=(name==='guide')===guide;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  stationGuide.render();if(scroll){guideJumpPending=false;requestAnimationFrame(()=>$(guide?(innerWidth<=1000?'screen-column':'guide'):'library').scrollIntoView({block:'start'}));}
}
for(const name of ['guide','library'])$(name+'-tab').addEventListener('click',()=>{showBrowseView(name);location.hash=name;});
document.querySelector('.browse-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const view=event.key==='Home'?'guide':event.key==='End'?'library':$('guide').hidden?'guide':'library';showBrowseView(view);$(view+'-tab').focus();});
window.addEventListener('hashchange',()=>{if(['#guide','#library'].includes(location.hash))showBrowseView(location.hash.slice(1),{scroll:true});else if(location.hash==='#watch'){showBrowseView('library');$('watch').scrollIntoView({block:'start'});}});
showBrowseView(location.hash==='#guide'?'guide':'library');
mountChannelBuilder({getCatalog:()=>catalog,isReady:()=>ownerMode||publicCatalogReady,onTune:async showIds=>{const next=copyCatalog();Object.assign(next.settings,{channel:'mixed',streamShow:null,streamShows:showIds,rotation:'random',shuffleSeed:newMix()});if(next.settings.channelRemixes)delete next.settings.channelRemixes.mixed;next.epoch=Date.now()/1000;if(!await commitSettings(next))return false;stopPlayer();render();tuneLive();$('player-shell').scrollIntoView({block:'center',behavior:'smooth'});return true;}});
$('open-stream-settings').addEventListener('click',()=>$('stream-settings').showModal());
for(const id of ['close-stream-settings','done-stream-settings'])$(id).addEventListener('click',()=>$('stream-settings').close());

async function playFromGuide(selection,live) {
  if(!ownerMode&&!publicCatalogReady)return false;
  const next=copyCatalog();next.settings.channel=selection.channel.id;next.settings.streamShow=null;next.settings.streamShows=null;
  if(!await commitSettings(next))return false;
  if(live&&!buildSchedule(catalog).length){notify('This channel no longer has a checked schedule. Select another channel.');render();return false;}
  const chosen=live?null:guidePlayback(catalog,selection);
  if(!live&&!chosen){notify('This guide item is no longer in the station. Select another program.');render();return false;}
  stopPlayer();render();
  if(live)tuneLive();else playEpisode(chosen.show,chosen.episode,chosen.source,0,'start','station',playbackPosition(chosen.schedule,chosen.index));
  if(!document.body.classList.contains('guide-view')||innerWidth<=1000)$('player-shell').scrollIntoView({block:'center',behavior:'smooth'});return true;
}

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
async function copyEpisodeLink(show, source, seconds = 0) {
  const baseUrl = new URL(location.pathname, location.origin).href;
  let url;
  try { url = createEpisodeLink({ baseUrl, showId: show.id, sourceUrl: source.url, seconds }); }
  catch (error) { notify(`Could not share this source: ${error.message}`); return; }
  $('share-url').value = url;
  try { await navigator.clipboard.writeText(url); notify(seconds > 0 ? 'Episode link and position copied.' : 'Episode link copied.'); }
  catch {
    $('share-copy-status').textContent = 'Select and copy the link below.';
    if (!$('share-dialog').open) $('share-dialog').showModal();
    $('share-url').focus(); $('share-url').select();
  }
}
function resolveSharedEpisode() {
  if(!ownerMode&&!publicCatalogReady){sharedTarget=null;return;}
  const descriptor = parseEpisodeLink(location.href);
  if (!descriptor) { sharedTarget = null; $('shared-episode').hidden = true; return; }
  const found = findSharedEpisode(catalog, descriptor);
  sharedTarget = found ? { ...found, seconds: descriptor.seconds } : null;
  $('shared-episode').hidden = false;
  $('shared-original').href = descriptor.sourceUrl;
  $('shared-title').textContent = found ? `${found.show.title} · ${found.episode.title}` : 'Shared video';
  $('shared-detail').textContent = found ? descriptor.seconds > 0 ? `Start at ${playbackTime(descriptor.seconds)}, or open the original source.` : 'Start this episode from the beginning.' : 'This source is not in this browser’s catalog. Open the original source to watch it.';
  $('play-shared').hidden = !found;
}
function copyCatalog() { return structuredClone(catalog); }
async function commit(next) {
  const base = catalog; pendingWrites++;
  try { catalog = await catalogStore.save(next,base); publisherReview=null; if (publicationUi) publicationUi.confirm.disabled=true; return true; }
  catch (error) {
    rejectedCatalog = next; lastSaveError=error.message; unsavedChanges = true;
    notify(error instanceof CatalogConflict ? error.message : `Could not save this change: ${error.message}. The saved catalog and this tab’s draft are preserved.`);
    showCatalogRecovery(); return false;
  } finally { pendingWrites--; }
}
function downloadCatalog(value, filename = 'yata-catalog.json') {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)], {type:'application/json'}));
  const a = element('a'); a.href = url; a.download = filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showCatalogRecovery() {
  let panel = $('catalog-recovery');
  if (!panel) { panel = element('div',null,'transport'); panel.id = 'catalog-recovery'; $('notice').after(panel); }
  const dialog = [$('source-dialog'),$('bulk-dialog')].find(node=>node.open);
  if (dialog) dialog.append(panel); else $('notice').after(panel);
  panel.replaceChildren(element('p',catalogStore.writable ? 'Saved data changed in another tab or this change could not be saved. This tab has not been reloaded.' : 'Catalog changes are read-only in this browser because safe tab coordination is unavailable. Playback and export still work; tuning changes last for this tab only.'),
    button('Export this tab’s catalog',()=>downloadCatalog(rejectedCatalog || catalog,'yata-unsaved-catalog.json')),
    button('Reload saved catalog',()=>{ if (confirm('Reload the saved catalog? Unsaved forms and this tab’s pending catalog changes will be discarded. Export this tab’s catalog first to keep a copy.')) { unsavedChanges=false; location.reload(); } }));
}
catalogStore.subscribe?.(()=>{notify('Another tab changed the saved owner catalog. Your open forms and playback are unchanged. Export your work before reloading.');showCatalogRecovery();});
window.addEventListener('focus',()=>{void catalogStore.checkForChanges?.();});
window.addEventListener('storage',event=>{ if (ownerMode && event.key === STORAGE_KEY && catalogStore.isStale()) { notify('Another tab changed the saved catalog. Your open forms and playback are unchanged. Export your work before reloading.'); showCatalogRecovery(); } });
for (const name of ['input','change']) document.addEventListener(name,event=>{ if (event.target.closest?.('#source-form, #bulk-dialog')) unsavedChanges=true; });
window.addEventListener('beforeunload',event=>{ if (unsavedChanges || pendingWrites) { event.preventDefault(); event.returnValue=''; } });
function openViewerCatalog() {
  const seed=createSeed(), loaded=readCatalog(storage,seed,{persistMigration:false});
  viewerPreferences={settings:loaded.catalog.settings,epoch:loaded.catalog.epoch};
  try { const saved=JSON.parse(storage.getItem(VIEWER_SETTINGS_KEY)||'null'); if(saved?.settings)viewerPreferences=saved; } catch { /* Preserve legacy preferences without trusting legacy content. */ }
  // Legacy source definitions and revision flags are never a public master.
  const placeholder={...seed,shows:[{id:'shared-catalog-loading',title:'Shared catalog loading',channel:'scifi',imdbUrl:null,episodes:[]}]};
  const current=mergePublishedCatalog(placeholder,viewerPreferences);
  return {loaded,catalog:current,writable:false,isStale:()=>false};
}
async function commitMetadata(next) { if(ownerMode)return commit(next); catalog=validateCatalog(next); return true; }
async function commitSettings(next) {
  if(!ownerMode) {
    catalog=validateCatalog(next);
    viewerPreferences={settings:catalog.settings,epoch:catalog.epoch};
    try {storage.setItem(VIEWER_SETTINGS_KEY,JSON.stringify(viewerPreferences));}catch {notify('Tuning changes apply to this tab; preferences could not be saved.');}
    return true;
  }
  if (catalogStore.writable) return commit(next);
  catalog=validateCatalog(next); return true; // Session-only tuning never writes an unlocked catalog.
}
function selectedChannel() { return CHANNELS.find(c => c.id === catalog.settings.channel); }
function channelShows() { return catalog.shows.filter(s => s.id === COMMERCIAL_SHOW_ID || catalog.settings.channel === 'mixed' || s.channel === catalog.settings.channel); }
function currentGuide() { return schedulePosition(buildSchedule(catalog), scheduleEpoch(catalog)); }
function episodeDetail(e, movie = false) {
  const order = e.season ? `S${String(e.season).padStart(2, '0')} · E${String(e.number).padStart(2, '0')}` : `Item ${e.number}`;
  return `${e.kind === 'bumper' ? 'Commercial / bumper' : movie ? 'Feature film' : order} · ${timeLabel(e.durationSeconds)}${e.group ? ` · ${e.group}` : ''}`;
}

function renderChannels() {
  mixControls.sync();
  $('channels').replaceChildren(...CHANNELS.map(c => {
    const node = button('', async () => {
      const next = copyCatalog(); next.settings.channel = c.id; next.settings.streamShow = null; next.settings.streamShows = null;
      if (await commitSettings(next)) { selectedShowId = channelShows()[0]?.id || catalog.shows[0].id; stopPlayer(); render(); retroEffects.pulse(); }
    }, 'channel');
    node.setAttribute('aria-pressed', String(c.id === catalog.settings.channel && !catalog.settings.streamShows));
    node.setAttribute('aria-label', `Channel ${c.number}: ${c.name}`);
    const number = element('span', null, 'channel-number'); number.append(element('small', 'CH'), document.createTextNode(c.number));
    const label = element('span'); label.append(element('span', c.name, 'channel-name'), element('span', catalog.settings.rotation === 'ordered' ? 'Episodes in order' : c.subtitle, 'channel-subtitle'));
    node.append(number, label, element('span', null, 'dot')); return node;
  }));
  const channel = selectedChannel();
  const streamShow = catalog.shows.find(show => show.id === catalog.settings.streamShow);
  $('channel-label').textContent = `CH ${channel.number} · ${(catalog.settings.streamShows ? 'YOUR CHANNEL' : streamShow?.title || channel.name).toUpperCase()} · ${catalog.settings.rotation === 'random' ? 'RANDOM STREAM' : 'IN ORDER'}`;
  renderStreamSettings();
  $('bumpers').checked = catalog.settings.bumpers;
}

function renderGuide() {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const schedule = buildSchedule(catalog), position = schedulePosition(schedule, scheduleEpoch(catalog));
  const list = $('guide-list'); list.replaceChildren();
  $('tune-live').disabled = $('standby-play').disabled = !position;
  if (!position) {
    list.append(element('p', catalog.settings.channel==='mixed'&&!catalog.settings.streamShow&&!catalog.settings.streamShows&&catalog.settings.mixChannels?.length===0?'All channels in your YATA mix are off. Turn a switch on below.':ownerMode ? 'No checked episodes on this channel. Add a source or check an existing source in Library.' : 'No checked episodes on this channel. Browse Library for source links and wishlist shows.', 'empty'));
    $('rotation-note').textContent = 'Tubi links and YouTube playlists are available in the library, outside the live rotation.';
    if (!active) { $('playing-show').textContent = 'CHANNEL OFF AIR'; $('playing-title').textContent = 'No checked episodes.'; $('playing-detail').textContent = ownerMode ? 'Add an episode source.' : 'Try another channel or browse the Library.'; }
    return;
  }
  let startsAt = Date.now() / 1000 - position.offset;
  for (let i = 0; i < Math.min(4, schedule.length); i++) {
    const entry = schedule[(position.index + i) % schedule.length];
    const row = element('div', null, 'guide-row');
    const clock = i === 0 ? 'NOW' : new Date(startsAt * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    row.append(element('span', clock, 'guide-time'));
    const body = element('div', null, 'guide-copy');
    body.append(element('h3', entry.show.title), element('p', entry.episode.title), element('p', episodeDetail(entry.episode, entry.show.id === MOVIE_SHOW_ID)));
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
    $('playing-detail').textContent = `${episodeDetail(position.current.episode, position.current.show.id === MOVIE_SHOW_ID)} · ${providerName[position.current.source.provider]}`;
  }
}

function renderLibrary() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const movies = catalog.shows.find(show => show.id === MOVIE_SHOW_ID);
  const movieMatch = movies && (movies.title.toLocaleLowerCase().includes(query) || movies.episodes.some(episode => episode.title.toLocaleLowerCase().includes(query)));
  const movieVisible = ['mixed', 'scifi'].includes(catalog.settings.channel) && movieMatch;
  $('movie-section').hidden = !movieVisible;
  const readyMovies = movies?.episodes.filter(episode => episode.kind === 'episode' && parseDuration(episode.durationSeconds) && stationSource(episode)).length || 0;
  $('movie-count').textContent = `${readyMovies} checked films · ${(movies?.episodes.length || 0) - readyMovies} wishlist / unchecked items`;
  $('movie-shuffle').disabled = !readyMovies;
  const shows = channelShows().filter(s => s.id !== MOVIE_SHOW_ID && s.title.toLocaleLowerCase().includes(query));
  const itemCount = channelShows().reduce((n, show) => n + show.episodes.length, 0);
  $('library-count').textContent = `${channelShows().length} shows & collections · ${itemCount} catalog episodes and items`;
  $('library-empty').hidden = shows.length > 0 || movieVisible;
  $('library-grid').replaceChildren(...shows.map(s => {
    const card = element('article', null, 'show-card');
    const art = button('', () => openShow(s.id), 'show-art');
    art.style.setProperty('--tile', tiles[catalog.shows.indexOf(s) % tiles.length]);
    art.setAttribute('aria-label', `View episodes and sources for ${s.title}`);
    art.append(element('small', s.id.endsWith('-bumps') ? 'NETWORK / BUMPS & INTERSTITIALS' : s.id === COMMERCIAL_SHOW_ID ? 'VINTAGE / COMMERCIALS' : s.channel === 'late-night' ? 'LATE NIGHT / ADULT ANIMATION' : s.channel === 'seventies' ? '70s / PRIME TIME' : s.channel === 'comedy' ? 'COMEDY / CLASSIC LAUGHS' : s.channel === 'action' ? 'ACTION / ADVENTURE' : s.channel === 'scifi' ? 'SCI-FI / RETRO FUTURES' : 'SATURDAY / MORNING'), element('strong', s.title));
    const count = s.episodes.length, live = s.episodes.filter(e => e.kind === 'episode' && stationSource(e) && e.durationSeconds > 0).length;
    let status = 'No episode sources yet · add yours';
    if (count) status = (s.id === COMMERCIAL_SHOW_ID || s.id.endsWith('-bumps')) ? `${count} optional break clips · ${catalog.settings.bumpers ? 'enabled between stories' : 'off until enabled'}` : live ? `${live} in live rotation · ${count} catalog ${count === 1 ? 'item' : 'items'}` : `${count} ${count === 1 ? 'source item' : 'source items'} · watch from the library`;
    card.append(art, element('h3', s.title, 'show-title'), element('p', status, `show-status${live ? ' available' : ''}`));
    return card;
  }));
}

function render() { renderChannels(); renderGuide(); renderLibrary(); renderDials(); stationGuide.render();
  if(guideJumpPending&&(ownerMode||publicCatalogReady)&&!$('guide').hidden){guideJumpPending=false;requestAnimationFrame(()=>{if(!$('guide').hidden)$(innerWidth<=1000?'screen-column':'guide').scrollIntoView({block:'start'});});}
}

function openShow(showId) {
  if(!ownerMode&&!publicCatalogReady)return;
  selectedShowId = showId;
  const show = catalog.shows.find(s => s.id === showId);
  if (!show) return;
  $('show-title').textContent = show.title;
  $('show-shuffle').textContent = show.id === MOVIE_SHOW_ID ? '▶ Random movie stream' : '▶ Shuffle this show';
  $('show-add').textContent = show.id === MOVIE_SHOW_ID ? '+ Add a film source' : '+ Add an episode source';
  $('show-shuffle').disabled = !show.episodes.some(episode => episode.kind === 'episode' && episode.durationSeconds > 0 && stationSource(episode));
  const imdb = $('show-imdb'); imdb.hidden = !show.imdbUrl;
  if (show.imdbUrl) imdb.href = show.imdbUrl;
  const rows = show.episodes.slice().sort((a, b) => a.season - b.season || a.number - b.number).map(e => {
    const row = element('article', null, 'episode-row');
    row.append(element('h3', e.title), element('p', episodeDetail(e, show.id === MOVIE_SHOW_ID), 'episode-meta'));
    const sources = element('div', null, 'sources');
    for (const source of e.sources) {
      const parsed = parseSourceUrl(source.url);
      if (parsed.kind === 'external') sources.append(link(`Watch on ${providerName[source.provider]} ↗`, source.url, 'button small'));
      else sources.append(button(`▶ ${providerName[source.provider]}${parsed.kind === 'playlist' ? ' playlist' : ''}`, () => {
        $('show-dialog').close(); playEpisode(show, e, source, 0, 'start'); $('watch').scrollIntoView();
      }));
      if (parsed.kind !== 'external') sources.append(link('Original ↗', source.url, 'button small'));
      if (ownerMode && catalogStore.writable) sources.append(button('Remove source',async()=>{
        const next=copyCatalog(), current=next.shows.find(item=>item.id===show.id)?.episodes.find(item=>item.id===e.id);
        if (!current) return;
        excludeSource(next,show.id,source.url); current.sources=current.sources.filter(item=>item.id!==source.id);
        if (await commit(next)) { if (active?.sourceId===source.id) stopPlayer(); render(); openShow(show.id); }
      },'text-button'));
    }
    row.append(sources);
    const statuses = e.sources.map(s => `${providerName[s.provider]}: ${parseSourceUrl(s.url).kind === 'external' ? `opens on ${providerName[s.provider]}` : s.availability === 'verified' ? 'source checked; availability may change' : 'playback not checked'}`);
    row.append(element('p', statuses.join(' · ') || 'No sources attached', 'episode-meta'));
    const tools = element('div', null, 'episode-tools');
    const shareSource = stationSource(e) || e.sources[0];
    if (shareSource) tools.append(button('Share episode ↗', () => { void copyEpisodeLink(show, shareSource); }, 'text-button'));
    if (ownerMode && catalogStore.writable) tools.append(button('Edit details / add another source', () => openSource(show.id, e.id), 'text-button'));
    if (ownerMode && catalogStore.writable) tools.append(button('Remove item', async () => {
      const next = copyCatalog(), target=next.shows.find(item=>item.id===show.id), current=target?.episodes.find(item=>item.id===e.id);
      if (!current) return;
      excludeEpisode(next,target,current); target.episodes=target.episodes.filter(item=>item.id!==e.id);
      if (await commit(next)) { if (active?.episodeId === e.id) stopPlayer(); render(); openShow(show.id); notify('Item removed. Import a saved catalog to restore an exported copy.'); }
    }, 'text-button'));
    row.append(tools); return row;
  });
  $('show-episodes').replaceChildren(...(rows.length ? rows : [element('p', 'No matched episodes were found in the current public-source search. Add a source if you find another collection.', 'empty')]));
  if (!$('show-dialog').open) $('show-dialog').showModal();
}

function openSource(showId = selectedShowId, episodeId = null) {
  if (!ownerMode || !catalogStore.writable) return;
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
  $('source-heading').textContent = e ? 'Edit episode.' : 'Add a source.';
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
  if(!ownerMode&&!publicCatalogReady)return;
  stopPlayer();
  const generation = playerGeneration;
  retroEffects.pulse();
  active = { showId: show.id, episodeId: episode.id, sourceId: source.id, offset, mode, queueMode, queuePosition };
  $('standby').hidden = true;
  $('playing-show').textContent = show.title.toUpperCase();
  $('playing-title').textContent = episode.title;
  $('playing-detail').textContent = `${episodeDetail(episode, show.id === MOVIE_SHOW_ID)} · ${mode === 'live' ? 'Station clock · best-effort sync' : offset > 0 ? `From ${playbackTime(offset)}` : 'From the beginning'} · ${providerName[source.provider]}`;
  $('original-link').href = $('error-original').href = source.url;
  $('original-link').hidden = false;
  $('playback-state').textContent = 'LOADING SOURCE';
  const verified = async duration => {
    if (generation !== playerGeneration || !Number.isFinite(duration) || duration <= 0 || duration > 86400) return;
    if (source.provider === 'youtube') $('playback-state').textContent = 'PLAYING · YOUTUBE';
    const isPlaylist = parseSourceUrl(source.url).kind === 'playlist';
    if (ownerMode && !catalogStore.writable) return;
    const next = copyCatalog(); const e = next.shows.find(s => s.id === show.id)?.episodes.find(e => e.id === episode.id);
    const src = e?.sources.find(s => s.id === source.id);
    if (!e || !src || ((isPlaylist || Math.abs((e.durationSeconds || 0) - duration) < 1) && src.availability === 'verified')) return;
    if (!isPlaylist) e.durationSeconds = duration;
    src.availability = 'verified';
    if (await commitMetadata(next)) {
      if (generation === playerGeneration && active) $('playing-detail').textContent = `${episodeDetail(e, show.id === MOVIE_SHOW_ID)} · ${active.mode === 'live' ? 'Station clock · best-effort sync' : offset > 0 ? `From ${playbackTime(offset)}` : 'From the beginning'} · ${providerName[source.provider]}`;
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
  if(!ownerMode&&!publicCatalogReady)return;
  const queue = buildSchedule(catalog), p = schedulePosition(queue, scheduleEpoch(catalog));
  if (p) playEpisode(p.current.show, p.current.episode, p.current.source, p.offset, 'live', 'station', playbackPosition(queue, p.index));
  else openSource();
}
function markTimeShift() {
  if (!active) return;
  active.mode = 'start';
  const show = catalog.shows.find(s => s.id === active.showId), episode = show?.episodes.find(e => e.id === active.episodeId);
  const source = episode?.sources.find(s => s.id === active.sourceId);
  if (episode && source) $('playing-detail').textContent = `${episodeDetail(episode, show.id === MOVIE_SHOW_ID)} · Watching on your time · ${providerName[source.provider]}`;
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
  $('share-episode').disabled = !active;
  $('share-time').disabled = !ready;
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
$('share-episode').addEventListener('click', () => {
  if (!active) return;
  const show = catalog.shows.find(show => show.id === active.showId), episode = show?.episodes.find(episode => episode.id === active.episodeId);
  const source = episode?.sources.find(source => source.id === active.sourceId);
  if (!source) return;
  const seconds = $('share-time').checked && !$('share-time').disabled && parseSourceUrl(source.url).kind === 'video' ? Math.floor(transportState()?.currentTime ?? active.offset ?? 0) : 0;
  void copyEpisodeLink(show, source, seconds);
});
$('play-shared').addEventListener('click', () => {
  if (!sharedTarget) return;
  const {show,episode,source,seconds} = sharedTarget;
  playEpisode(show,episode,source,seconds,'start','show'); $('watch').scrollIntoView();
});
$('copy-share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('share-url').value); $('share-copy-status').textContent = 'Link copied.'; }
  catch { $('share-url').focus(); $('share-url').select(); $('share-copy-status').textContent = 'Select and copy the link manually.'; }
});
$('close-share').addEventListener('click', () => $('share-dialog').close());
$('share-dialog').addEventListener('keydown', event => { if (event.key === 'Escape' || event.key === 'Tab') event.stopPropagation(); });
window.addEventListener('hashchange', resolveSharedEpisode);
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
  event.preventDefault(); if (!ownerMode || !catalogStore.writable || importBusy) return;
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
    for (const episode of show.episodes) restoreExcluded(next,show,episode);
    validateCatalog(next);
    if (!await commit(next)) throw Error(lastSaveError || 'The source was not saved. Your draft is still here.');
    unsavedChanges=false; $('source-dialog').close(); notify(episodeId ? 'Episode details saved.' : 'Source added. Open the show to watch or check playback.'); render(); openShow(showId);
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
$('bumpers').addEventListener('change', async () => {
  const enabled = $('bumpers').checked;
  const next = copyCatalog(); next.settings.bumpers = enabled;
  if (await commitSettings(next)) {
    if (catalogStore.writable) markCommercialPreference(storage);
    render(); renderTransport();
    notify(enabled ? 'Vintage commercials and checked bumpers enabled between complete stories. Use Next to skip a break.' : 'Upcoming commercial breaks and bumpers are off. Current playback is unchanged.');
  } else $('bumpers').checked = catalog.settings.bumpers;
});
$('export-catalog').addEventListener('click', () => { if (ownerMode) downloadCatalog(catalog); });
$('import-catalog').addEventListener('change', async event => {
  if (!ownerMode || !catalogStore.writable) return;
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > MAX_IMPORT_BYTES) throw Error('Import exceeds the 8 MB catalog limit.');
    const next = parseCatalogJson(await file.text());
    if (!await commit(next)) return;
    stopPlayer(); selectedShowId = catalog.shows[0].id; render(); notify('Catalog imported and saved.');
  } catch (error) { notify(`${error.message} Your previous catalog is unchanged.`); }
  finally { event.target.value = ''; }
});


for (const id of ['manage-sources','guide-add','show-add','seed-all','bulk-open','import-catalog']) {
  if (!ownerMode || !catalogStore.writable) { $(id).hidden=true; $(id).disabled=true; }
}
if (!catalogStore.writable) document.querySelector('.import-button').hidden=true;
if (!ownerMode) {
  document.querySelector('.collection-tools').hidden=true;
  for (const id of ['source-dialog','bulk-dialog']) {
    $(id).hidden=true;
    for (const control of $(id).querySelectorAll('button,input,select,textarea')) control.disabled=true;
  }
}

publicationUi = ownerMode ? createPublisherUi() : null;
if(!ownerMode){
  $('library-count').after(button('Refresh shared catalog',()=>refreshSharedCatalog(),'text-button'));
  const state=element('section',null,'transport public-catalog-state');state.id='public-catalog-state';
  const text=element('p','Loading the shared catalog…');text.id='public-catalog-message';text.setAttribute('role','status');
  const retry=button('Retry shared catalog',()=>refreshSharedCatalog(),'button small');retry.id='retry-shared-catalog';retry.hidden=true;state.append(text,retry);$('notice').after(state);
}
if(!ownerMode&&hadSavedCatalog){
  const recovery=element('details',null,'legacy-recovery');
  recovery.append(element('summary','Previous browser backup'));
  recovery.append(element('p','Your previous browser catalog is preserved separately. Export it to recover unpublished personal sources.'),button('Export previous browser catalog',()=>{
    try {const raw=storage.getItem(STORAGE_KEY);if(raw){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=element('a');a.href=url;a.download='yata-legacy-catalog.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
    catch {notify('The previous browser catalog could not be read.');}
  }));document.querySelector('footer').append(recovery);
}
render();
if (ownerMode && !catalogStore.writable) { notify('Catalog changes are read-only: safe tab coordination is unavailable. Playback and export remain available.'); showCatalogRecovery(); }
if (loaded.error && ownerMode) notify(loaded.error);
setInterval(()=>{renderGuide();stationGuide.render();}, 15000);
window.addEventListener('pagehide', () => session?.dispose());

let batchRows = [], batchPage = 0, batchFilter = '', wholeLibrary = false;
$('bulk-open').addEventListener('click', () => {
  if (!ownerMode || !catalogStore.writable) return;
  $('bulk-show').replaceChildren(...catalog.shows.map(show => { const option = element('option', show.title); option.value = show.id; return option; }));
  $('bulk-show').value = selectedShowId;
  $('bulk-dialog').showModal();
});
$('bulk-close').addEventListener('click', () => $('bulk-dialog').close());
$('bulk-discover').addEventListener('click', async () => {
  if (!ownerMode || !catalogStore.writable) return;
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
$('bulk-approve').addEventListener('click', async () => {
  if (!ownerMode || !catalogStore.writable) return;
  try {
    const result = wholeLibrary ? mergeLibraryBatch(libraryBase(), batchRows) : mergeBatch(catalog, batchRows);
    if (!await commit(result.catalog)) return;
    unsavedChanges=false; batchRows = []; $('bulk-pages').replaceChildren(); $('bulk-preview').replaceChildren(); $('bulk-approve').hidden = true;
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
  if (!ownerMode || !catalogStore.writable) return;
  wholeLibrary = false; batchPage = 0; batchFilter = ''; $('bulk-coverage').replaceChildren();
  batchRows = STARTER_PACK.map(item => {
    const episode = youtubeEpisodes(item)[0];
    return { selected: true, showId: item.showId, episode };
  });
  renderBatch(); $('bulk-approve').hidden = false;
  $('bulk-status').textContent = 'Five official-channel episode candidates. Review titles and order before adding. YouTube playback still needs checking; season 0 means unknown.';
});
$('bulk-transformers').addEventListener('click', () => {
  if (!ownerMode || !catalogStore.writable) return;
  $('bulk-show').value = 'transformers';
  $('bulk-links').value = 'https://www.youtube.com/playlist?list=PLD3dCMp2WHixUHTv2TETDETzoB148KoPy';
  $('bulk-status').textContent = 'Official Hasbro Pulse collection selected. Choose Discover episodes, then review episode order before adding.';
});

async function loadWholeLibrary() {
  if (!ownerMode || !catalogStore.writable) return;
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
$('seed-all').addEventListener('click', () => { if (!ownerMode || !catalogStore.writable) return; $('bulk-open').click(); loadWholeLibrary(); });

function libraryBase() { return extendLibraryCatalog(catalog, createSeed()); }
const LIBRARY_REVISION_KEY = 'drew-tv.library-revision.v1';
async function fetchLibrary() {
  const response = await fetch('data/library-manifest.json');
  if (!response.ok) throw Error('The expanded episode library is not ready yet.');
  const manifest = await response.json();
  if (typeof manifest.revision !== 'string' || !/^[a-z0-9.-]{1,100}$/.test(manifest.revision)) throw Error('Invalid library revision.');
  const packs = await Promise.all(['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson', 'cartoon-extras', 'stephanie-cartoons', 'late-night', 'network-expansion', 'classic-comedy', 'time-travel', 'star-trek', 'retro-requests', 'saturday-adventure', 'expanded-era', 'drama', 'channel-additions'].map(async provider => {
    const response = await fetch(`data/${provider}-discovery.json`);
    if (!response.ok) throw Error('A library source file could not be loaded. Your catalog is unchanged.');
    return response.json();
  }));
  return { manifest, packs };
}
async function installExpandedLibrary() {
  if(!ownerMode)return;
  // A damaged saved catalog must remain recoverable instead of being overwritten.
  if (loaded.error && ownerMode) return;
  try {
    if (ownerMode && !catalogStore.writable) return;
    const { manifest, packs } = await fetchLibrary();
    if (ownerMode && storage.getItem(LIBRARY_REVISION_KEY) === manifest.revision) return;
    const base = libraryBase();
    const rows = discoveryRows(base, packs);
    const result = mergeLibraryBatch(base, rows);
    if (ownerMode) { if (!await commit(result.catalog)) return; } else catalog=mergePublishedCatalog(result.catalog,viewerPreferences);
    try { if(ownerMode)storage.setItem(LIBRARY_REVISION_KEY, manifest.revision); } catch { /* Repeat imports remain additive and URL-deduplicated. */ }
    render();
    if ($('show-dialog').open) openShow(selectedShowId);
    notify(`Expanded library added: ${result.added} episodes and ${result.alternatives} alternative sources. Existing sources and settings were preserved. YouTube entries still need a playback check.`);
  } catch (error) { notify(`Expanded library could not be added: ${error.message}`); }
}
bootstrapSharedCatalog().finally(resolveSharedEpisode);
// Existing viewers pick up the published master without reloading the player.
setInterval(()=>{if (!document.hidden && !ownerMode) void refreshSharedCatalog();},60000);
document.addEventListener('visibilitychange',()=>{if (!document.hidden && !ownerMode) void refreshSharedCatalog();});

if (staticHosting) {
  $('bulk-transformers').hidden = true;
  const note = element('p', 'This hosted station supports the curated library and Archive bulk discovery. Add YouTube videos or playlists through Manage sources; expanding a new YouTube playlist into individual episodes requires the local importer.', 'muted');
  $('bulk-links').parentElement.before(note);
}

function currentDialShowId() {
  if (catalog.settings.streamShow) return catalog.settings.streamShow;
  if (active) {
    if (active.showId !== COMMERCIAL_SHOW_ID && active.queuePosition?.isBumper !== true) return active.showId;
    if (active.queuePosition?.ownerShowId) return active.queuePosition.ownerShowId;
    const programId = active.queuePosition?.previousProgramId || active.queuePosition?.nextProgramId;
    const owner = catalog.shows.find(show => show.episodes.some(episode => episode.id === programId));
    if (owner) return owner.id;
  }
  return currentGuide()?.current.show.id || null;
}
function renderDials() {
  const names = { channel: 'Random mix in this channel', show: 'One random show', all: 'Random mix of everything' };
  $('dial-mode').value = dialMode;
  $('dial-next-show').disabled = !availableDialShows(catalog).length;
  $('dial-next-show').title = `Next playable show in ${selectedChannel().name}`;
  $('dial-next-show').setAttribute('aria-label', $('dial-next-show').title);
  $('dial-random').disabled = !availableDialShows(catalog, dialMode === 'all' ? 'mixed' : catalog.settings.channel).length;
  $('dial-random').title = names[dialMode]; $('dial-random').setAttribute('aria-label', names[dialMode]);
}
$('dial-mode').addEventListener('change', () => {
  dialMode = ['channel', 'show', 'all'].includes($('dial-mode').value) ? $('dial-mode').value : 'channel';
  try { storage.setItem(DIAL_MODE_STORAGE_KEY, dialMode); } catch { /* Optional preference persistence. */ }
  renderDials();
});
$('dial-next-show').addEventListener('click', async () => {
  const show = nextDialShow(catalog, currentDialShowId());
  if (!show) { notify('No checked shows are available in this channel yet.'); return; }
  dialFeedback.play(); selectedShowId = show.id;
  if (await configureStream({ streamShow: show.id, rotation: 'random', shuffleSeed: newMix() }, true)) notify(`Tuned to ${show.title}.`);
});
$('dial-random').addEventListener('click', async () => {
  const patch = randomDialPatch(catalog, { mode: dialMode, seed: newMix(), currentShowId: currentDialShowId() });
  if (!patch) { notify('No checked shows are available for this mix yet.'); return; }
  dialFeedback.play();
  if (await configureStream(patch, true)) notify(patch.streamShow ? `Random show: ${catalog.shows.find(show => show.id === patch.streamShow).title}.` : `New random mix: ${selectedChannel().name}.`);
});
function renderStreamSettings() {
  $('settings-summary').textContent=`${catalog.settings.streamShows?'Your channel':catalog.settings.rotation==='random'?'Random mix':'Episode order'} · Commercials ${catalog.settings.bumpers?'on':'off'}`;
  $('stream-rotation').value = catalog.settings.rotation;
  const all = element('option', catalog.settings.channel === 'mixed' ? 'Any show · everything' : `Any show · ${selectedChannel().name}`); all.value = '';
  $('stream-show').replaceChildren(all, ...channelShows().map(show => {
    const count = show.episodes.filter(episode => episode.kind === 'episode' && episode.durationSeconds > 0 && stationSource(episode)).length;
    const option = element('option', `${show.title}${show.id === MOVIE_SHOW_ID ? ' · movies only' : ''} · ${count} checked`); option.value = show.id; option.disabled = !count; return option;
  }));
  $('stream-show').value = catalog.settings.streamShow || '';
  $('stream-run').value = String(catalog.settings.storiesPerTurn);
  $('commercial-count').value = String(catalog.settings.commercialCount);
  $('commercial-count').disabled = !catalog.settings.bumpers;
  $('stream-run').disabled = catalog.settings.rotation !== 'random' || !!catalog.settings.streamShow;
  $('stream-reshuffle').disabled = catalog.settings.rotation !== 'random';
  const title = catalog.shows.find(show => show.id === catalog.settings.streamShow)?.title;
  $('stream-description').textContent = catalog.settings.rotation === 'random'
    ? title ? catalog.settings.streamShow === MOVIE_SHOW_ID ? 'Random feature films only. Movies stay out of ordinary TV mixes; each film plays before the pool repeats.' : `Random ${title} episodes, continuously. Each story plays before its pool repeats.`
      : `Random episodes from random shows · ${catalog.settings.storiesPerTurn} ${catalog.settings.storiesPerTurn === 1 ? 'story' : 'stories'} per show turn. Smaller libraries keep their turn; multipart stories stay together. Serialized dramas stay in episode order.`
    : `${title || 'All shows in this channel'} in episode order. Switch to random for a shuffled stream.`;
}
async function configureStream(patch, play = false) {
  const wasPlaying = transportState()?.paused === false;
  const next = copyCatalog(); Object.assign(next.settings, patch); if('shuffleSeed' in patch&&next.settings.channelRemixes){delete next.settings.channelRemixes[next.settings.channel];} if ('channel' in patch || 'streamShow' in patch) next.settings.streamShows = null; next.epoch = Date.now() / 1000;if(next.settings.channelRemixes?.[next.settings.channel])next.settings.channelRemixes[next.settings.channel].epoch=next.epoch;
  if (!await commitSettings(next)) { renderStreamSettings(); return false; }
  stopPlayer(); render();
  if (play || wasPlaying) tuneLive();
  return true;
}
function newMix() { return Number.parseInt(crypto.randomUUID().slice(0, 8), 16); }
$('commercial-count').addEventListener('change', async () => {
  const value = $('commercial-count').value;
  const next = copyCatalog(); next.settings.commercialCount = value === 'random' ? 'random' : Number(value);
  if (await commitSettings(next)) { render(); renderTransport(); notify('Commercial break length saved for upcoming breaks.'); }
  else renderStreamSettings();
});
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

$('movie-browse').addEventListener('click', () => openShow(MOVIE_SHOW_ID));
$('movie-shuffle').addEventListener('click', async () => { if (await configureStream({channel: 'scifi', streamShow: MOVIE_SHOW_ID, rotation: 'random', shuffleSeed: newMix()}, true)) $('watch').scrollIntoView(); });


function createPublisherUi() {
  const panel=element('section',null,'transport owner-publisher');
  panel.append(element('h2','Publish the shared catalog'),element('p','Save your local edits, preview the exact changes, then confirm publication. Open form edits are not included.'));
  const status=element('p','Publishing changes the catalog seen by every visitor. Local edits stay private until confirmed.');status.setAttribute('role','status');
  const preview=button('Review publication',async()=>{
    preview.disabled=true; confirmButton.disabled=true; publisherReview=null;
    const frozen=catalog;
    try {
      const capability=await publisherRequest('capability'); publisherCsrf=capability.csrfToken;
      const payload=structuredClone(frozen);delete payload.publishedRevision;
      const review=await publisherRequest('preview',{catalog:payload});
      if(catalog!==frozen)throw Error('The local catalog changed during review. Review it again before publishing.');
      publisherReview={...review,baseCatalog:frozen};
      detail.textContent=JSON.stringify({counts:review.counts,changes:review.diff,expiresAt:review.expiresAt},null,2);
      status.textContent='Review the changes below. Confirm publishes this frozen catalog to every visitor.';confirmButton.disabled=false;
    } catch(error){status.textContent=error.message;} finally{preview.disabled=!catalogStore.writable;}
  });
  const confirmButton=button('Confirm publication',async()=>{
    const review=publisherReview;if(!review||review.baseCatalog!==catalog)return;
    confirmButton.disabled=true; preview.disabled=true;
    try {
      const receipt=await publisherRequest('confirm',{reviewId:review.reviewId});publisherReview=null;
      status.textContent=receipt.cacheInvalidationPending?'Catalog published. Cache refresh is pending; do not publish again.':'Catalog published. Visitors will receive the new shared catalog.';
      detail.textContent=JSON.stringify({revision:receipt.revision,counts:receipt.counts,updatedAt:receipt.updatedAt},null,2);
    } catch(error){publisherReview=null;status.textContent=error.message+' Review again before confirming.';}
    finally{preview.disabled=!catalogStore.writable;}
  });confirmButton.disabled=true;preview.disabled=!catalogStore.writable;
  const detail=element('pre',null,'publisher-review');
  const load=button('Load shared catalog',async()=>{
    if(!confirm('Replace this local catalog with the shared catalog? Export your local catalog first. Unsaved forms and unpublished local catalog edits will be discarded.'))return;
    try {
      const result=await loadOwnerSharedCatalog();
      if(!result.available)throw Error('No shared catalog has been published yet.');
      if(await applySharedCatalog(result)){unsavedChanges=false;status.textContent='Shared catalog loaded. Local edits can now be reviewed for publication.';}
    }catch(error){status.textContent=error.message;}
  });load.disabled=!catalogStore.writable;
  const add=button('Add a show',()=>{
    if(!ownerMode||!catalogStore.writable)return;
    const name=prompt('New show name');if(!name?.trim())return;
    const choice=prompt('Channel: action, scifi, cartoons, comedy, seventies, or late-night','scifi');if(!['action','scifi','cartoons','comedy','seventies','late-night'].includes(choice))return;
    const next=copyCatalog(), show={id:uid('show'),title:name.trim(),channel:choice,imdbUrl:null,episodes:[]};next.shows.push(show);
    void commit(next).then(saved=>{if(saved){selectedShowId=show.id;render();openShow(show.id);status.textContent='New show saved locally. Add sources, then review publication to share it.';}});
  });add.disabled=!catalogStore.writable;
  panel.append(add,preview,confirmButton,load,status,detail);document.querySelector('.collection-tools').after(panel);
  return {panel,status,preview,confirm:confirmButton};
}
async function publisherRequest(action,body) {
  if(!ownerMode)throw Error('Publishing is available only in the loopback owner application.');
  const response=await fetch(`api/publisher/${action}`,{method:'POST',headers:{'Content-Type':'application/json',...(publisherCsrf?{'X-YATA-CSRF':publisherCsrf}:{})},body:JSON.stringify(body||{})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Publishing could not be completed.');return result;
}
async function loadOwnerSharedCatalog() {
  const capability=await publisherRequest('capability');publisherCsrf=capability.csrfToken;
  return publisherRequest('shared');
}
async function applySharedCatalog(result) {
  const next=mergePublishedCatalog(result.catalog,ownerMode?catalog:viewerPreferences);next.publishedRevision=result.revision;
  if(!ownerMode)viewerPreferences={settings:next.settings,epoch:next.epoch};
  const currentSource=active&&catalog.shows.find(show=>show.id===active.showId)?.episodes.find(episode=>episode.id===active.episodeId)?.sources.find(source=>source.id===active.sourceId);
  if(ownerMode&&catalogStore.writable){if(!await commit(next))return false;}else catalog=next;
  if(active&&currentSource){
    for(const show of catalog.shows){const episode=show.episodes.find(item=>item.sources.some(source=>source.url===currentSource.url));if(episode){const source=episode.sources.find(item=>item.url===currentSource.url);active={...active,showId:show.id,episodeId:episode.id,sourceId:source.id,queuePosition:null};break;}}
  }
  if(!ownerMode){publicCatalogReady=true;document.body.classList.remove('public-catalog-pending');$('public-catalog-state').hidden=true;}
  selectedShowId=catalog.shows.some(show=>show.id===selectedShowId)?selectedShowId:catalog.shows[0].id;
  render();renderTransport();resolveSharedEpisode();return true;
}
async function bootstrapSharedCatalog() {
  try {
    const result=ownerMode?await loadOwnerSharedCatalog():await fetchPublishedCatalog({currentRevision:null});
    if(!result.available){if(ownerMode){await installExpandedLibrary();return;}throw Error('No shared catalog is available. Please try again.');}
    if(result.unchanged)return;
    if(ownerMode){publicationUi.status.textContent='A shared catalog is available. Your existing local draft is preserved; use Load shared catalog to replace it explicitly.';return;}
    await applySharedCatalog(result);
  }catch(error){
    if(ownerMode){try{await installExpandedLibrary();}catch{/* Retain the owner draft. */}notify(`Shared catalog could not be loaded: ${error.message}. The local draft is preserved.`);}
    else showPublicCatalogError(error);
  }
}
async function refreshSharedCatalog() {
  if(publishedBusy||catalogStore.isStale()||ownerMode)return;publishedBusy=true;
  try{const result=await fetchPublishedCatalog({currentRevision:publicCatalogReady?catalog.publishedRevision||null:null});if(!result.available)throw Error('No shared catalog is available.');if(!result.unchanged)await applySharedCatalog(result);}
  catch(error){if(publicCatalogReady)notify(`Shared catalog refresh failed: ${error.message}. Current playback and catalog are unchanged.`);else showPublicCatalogError(error);}
  finally{publishedBusy=false;}
}

function showPublicCatalogError(error){
  $('public-catalog-message').textContent=`The shared catalog could not be loaded: ${error.message} Your previous browser draft is unchanged.`;
  $('retry-shared-catalog').hidden=false;$('public-catalog-state').hidden=false;
}

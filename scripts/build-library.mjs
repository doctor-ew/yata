import {VIEWER_REQUEST_SHOWS} from '../src/viewer-requests.mjs';
import{THREE_TV_SHOWS}from'../src/three-tv.mjs';
import {VINTAGE_ADDITIONS} from '../src/vintage-additions.mjs';
import {CHANNEL_ADDITIONS} from '../src/channel-additions.mjs';
import { EXPANDED_ERA_SHOWS } from '../src/expanded-era.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { libraryRevision } from './library-revision.mjs';
import { MOVIE_SHOW_ID, ADDITIONAL_SCIFI_SERIES } from '../src/collections.mjs';
import { createSeed } from '../src/catalog.mjs';
import { discoveryRows, mergeLibraryBatch } from '../src/bulk.mjs';
import { buildSchedule, parseCatalogJson, stationSource, COMMERCIAL_SHOW_ID } from '../src/domain.mjs';
const data = new URL('../data/', import.meta.url);
const names = ['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson', 'cartoon-extras', 'stephanie-cartoons', 'late-night', 'network-expansion', 'classic-comedy', 'time-travel', 'star-trek', 'retro-requests', 'saturday-adventure', 'expanded-era', 'drama', 'channel-additions', 'vintage-additions', 'three-tv', 'viewer-requests'];
const extraCartoonIds = new Set(['mister-t', 'frankenstein-impossibles']);
const stephanieIds = new Set(["jem", "she-ra", "rainbow-brite", "care-bears", "strawberry-shortcake", "my-little-pony", "grimm-fairy-tale-classics", "grape-ape", "shirt-tales", "heathcliff", "garfield-friends"]);
const networkIds = new Set(["ycdtotv", "turkey-tv", "harvey-birdman", "sealab-2021", "home-movies", "brak-show", "daria", "taxi", "wkrp", "rockford-files", "bionic-woman", "josie-pussycats", "adult-swim-bumps", "nickelodeon-bumps"]);
const classicIds = new Set(["fat-albert", "good-times", "jeffersons", "sanford-son", "gimme-break", "kotter", "whos-boss"]);
const timeTravelIds = new Set(["quantum-leap", "flash-1990", "greatest-american-heroine"]);
const expandedEraIds = new Set(EXPANDED_ERA_SHOWS.map(show=>show.id));
const saturdayAdventureIds = new Set(['flash-gordon-1979','return-planet-apes','valley-dinosaurs']);
const retroRequestIds = new Set(['star-wars-droids','star-wars-holiday-special','sealab-2020','venture-bros']);
const trekIds = new Set(["star-trek-tos", "star-trek-tng", "star-trek-ds9", "star-trek-voyager", "star-trek-enterprise", "star-trek-tas"]);
const extraIds = new Set(ADDITIONAL_SCIFI_SERIES.map(([id]) => id));
const texts = await Promise.all(names.map(name => readFile(new URL(`${name}-discovery.json`, data), 'utf8')));
const packs = texts.map(JSON.parse);
const seed = createSeed(); let sequence = 0;
for (const [index, name] of names.entries()) {
  const expected = seed.shows.filter(show => {
    if(name==='viewer-requests')return VIEWER_REQUEST_SHOWS.some(s=>s.id===show.id);
    if(VIEWER_REQUEST_SHOWS.some(s=>s.id===show.id))return false;
    if(name==='three-tv')return THREE_TV_SHOWS.some(s=>s.id===show.id);
    if(THREE_TV_SHOWS.some(s=>s.id===show.id))return false;
    if(name==='vintage-additions')return VINTAGE_ADDITIONS.some(s=>s.id===show.id);
    if(VINTAGE_ADDITIONS.some(s=>s.id===show.id))return false;
    if (name === 'channel-additions') return CHANNEL_ADDITIONS.some(s=>s.id===show.id);
    if (CHANNEL_ADDITIONS.some(s=>s.id===show.id)) return false;
    if (name === 'drama') return show.channel==='drama'&&['st-elsewhere','hill-street-blues'].includes(show.id);
    if (['st-elsewhere','hill-street-blues'].includes(show.id)) return false;
    if (name === 'expanded-era') return expandedEraIds.has(show.id);
    if (expandedEraIds.has(show.id)) return false;
    if (name === 'saturday-adventure') return saturdayAdventureIds.has(show.id);
    if (saturdayAdventureIds.has(show.id)) return false;
    if (name === 'retro-requests') return retroRequestIds.has(show.id);
    if (retroRequestIds.has(show.id)) return false;
    if (name === 'star-trek') return trekIds.has(show.id);
    if (trekIds.has(show.id)) return false;
    if (name === 'time-travel') return timeTravelIds.has(show.id);
    if (timeTravelIds.has(show.id)) return false;
    if (name === 'classic-comedy') return classicIds.has(show.id);
    if (classicIds.has(show.id)) return false;
    if (name === 'network-expansion') return networkIds.has(show.id);
    if (networkIds.has(show.id)) return false;
    if (name === 'late-night') return show.channel === 'late-night';
    if (show.channel === 'late-night') return false;
    if (name === 'stephanie-cartoons') return stephanieIds.has(show.id);
    if (stephanieIds.has(show.id)) return false;
    if (name === 'cartoon-extras') return extraCartoonIds.has(show.id);
    if (name === 'seventies') return show.channel === 'seventies';
    if (name === 'benson') return show.id === 'benson';
    if (name === 'comedy') return show.channel === 'comedy' && show.id !== 'benson';
    if (name === 'movies') return show.id === MOVIE_SHOW_ID;
    if (name === 'scifi') return extraIds.has(show.id);
    if (name === 'commercials') return show.id === COMMERCIAL_SHOW_ID;
    return !extraCartoonIds.has(show.id) && show.channel !== 'seventies' && show.channel !== 'comedy' && show.id !== COMMERCIAL_SHOW_ID && show.id !== MOVIE_SHOW_ID && !extraIds.has(show.id) && show.id !== 'saturday-simulator' && (name === 'youtube' || (name === 'action' ? ['action', 'scifi'].includes(show.channel) : show.channel === 'cartoons'));
  }).map(show => show.id).sort();
  const actual = packs[index].shows.filter(show=>name!=='expanded-era'||show.showId!=='daria').map(show => show.showId).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw Error(`${name} discovery is incomplete or contains unexpected shows.`);
}
if (packs[2].curated !== true) throw Error('YouTube discovery must finish canonical title curation before building.');
const result = mergeLibraryBatch(seed, discoveryRows(seed, packs), () => String(++sequence));
const serialized = JSON.stringify(result.catalog);
parseCatalogJson(serialized);
const shows = result.catalog.shows.map(show => ({
  id: show.id, title: show.title, episodes: show.episodes.length,
  ready: show.episodes.filter(episode => episode.kind === 'episode' && episode.durationSeconds && stationSource(episode)).length,
  breaks: show.episodes.filter(episode => episode.kind === 'bumper' && episode.durationSeconds && stationSource(episode)).length,
  sources: show.episodes.reduce((count, episode) => count + episode.sources.length, 0),
}));
const manifest = {
  revision: libraryRevision(texts, seed),
  checkedAt: packs.map(pack => pack.checkedAt).filter(Boolean),
  episodes: shows.reduce((count, show) => count + show.episodes, 0),
  ready: shows.filter(show => show.id !== MOVIE_SHOW_ID).reduce((count, show) => count + show.ready, 0),
  movieReady: shows.find(show => show.id === MOVIE_SHOW_ID)?.ready || 0,
  breaks: shows.reduce((count, show) => count + show.breaks, 0),
  streamSlots: buildSchedule(result.catalog).length,
  shows, bytes: Buffer.byteLength(serialized),
  note: 'A bounded public-source search, not proof of complete worldwide series availability. Archive metadata and sampled endpoint checks do not establish decoding for every file. YouTube playback remains unverified until played.',
};
await writeFile(new URL('expanded-catalog.json', data), serialized + '\n');
await writeFile(new URL('library-manifest.json', data), JSON.stringify(manifest, null, 2) + '\n');
const report = `# Expanded library coverage\n\nRevision: ${manifest.revision}. Sources: public Archive metadata and official YouTube metadata. Counts include the original seed items.\n\n${manifest.episodes} catalog episodes/items; ${manifest.ready} TV entries eligible for ordinary station mixes, ${manifest.movieReady} films in the separate Midnight Matinee stream, and ${manifest.breaks} optional break clips by existing metadata rules. A schedulable source is not a guarantee of future playback.\n\n| Show | Catalog items | Program-ready | Break-ready | Source links |\n| --- | ---: | ---: | ---: | ---: |\n` + shows.map(show => `| ${show.title} | ${show.episodes} | ${show.ready} | ${show.breaks} | ${show.sources} |`).join('\n') + '\n\nSearch bounds, source collection URLs, exclusions and known gaps are recorded in each discovery JSON file. Unknown ordering remains season zero; matching titles and explicit season/episode pairs combine source alternatives.\n';
await writeFile(new URL('../docs/3/COVERAGE.md', import.meta.url), report);
console.log(JSON.stringify({ revision: manifest.revision, episodes: manifest.episodes, ready: manifest.ready, bytes: manifest.bytes, showsWithSources: shows.filter(show => show.episodes).length, gaps: shows.filter(show => !show.episodes).map(show => show.title) }));

import { readFile, writeFile } from 'node:fs/promises';
import { libraryRevision } from './library-revision.mjs';
import { MOVIE_SHOW_ID, ADDITIONAL_SCIFI_SERIES } from '../src/collections.mjs';
import { createSeed } from '../src/catalog.mjs';
import { discoveryRows, mergeLibraryBatch } from '../src/bulk.mjs';
import { buildSchedule, parseCatalogJson, stationSource, COMMERCIAL_SHOW_ID } from '../src/domain.mjs';
const data = new URL('../data/', import.meta.url);
const names = ['action', 'cartoon', 'youtube', 'commercials', 'scifi', 'movies', 'comedy', 'seventies', 'benson', 'cartoon-extras'];
const extraCartoonIds = new Set(['mister-t', 'frankenstein-impossibles']);
const extraIds = new Set(ADDITIONAL_SCIFI_SERIES.map(([id]) => id));
const texts = await Promise.all(names.map(name => readFile(new URL(`${name}-discovery.json`, data), 'utf8')));
const packs = texts.map(JSON.parse);
const seed = createSeed(); let sequence = 0;
for (const [index, name] of names.entries()) {
  const expected = seed.shows.filter(show => {
    if (name === 'cartoon-extras') return extraCartoonIds.has(show.id);
    if (name === 'seventies') return show.channel === 'seventies';
    if (name === 'benson') return show.id === 'benson';
    if (name === 'comedy') return show.channel === 'comedy' && show.id !== 'benson';
    if (name === 'movies') return show.id === MOVIE_SHOW_ID;
    if (name === 'scifi') return extraIds.has(show.id);
    if (name === 'commercials') return show.id === COMMERCIAL_SHOW_ID;
    return !extraCartoonIds.has(show.id) && show.channel !== 'seventies' && show.channel !== 'comedy' && show.id !== COMMERCIAL_SHOW_ID && show.id !== MOVIE_SHOW_ID && !extraIds.has(show.id) && show.id !== 'saturday-simulator' && (name === 'youtube' || (name === 'action' ? ['action', 'scifi'].includes(show.channel) : show.channel === 'cartoons'));
  }).map(show => show.id).sort();
  const actual = packs[index].shows.map(show => show.showId).sort();
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
await writeFile(new URL('../../docs/3/COVERAGE.md', import.meta.url), report);
console.log(JSON.stringify({ revision: manifest.revision, episodes: manifest.episodes, ready: manifest.ready, bytes: manifest.bytes, showsWithSources: shows.filter(show => show.episodes).length, gaps: shows.filter(show => !show.episodes).map(show => show.title) }));

// Rebuilds the reviewed Archive cartoon source pack from public metadata only.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { archiveEpisodes } from '../src/domain.mjs';
import { createSeed } from '../src/catalog.mjs';
const sources = {
  'he-man': ['he-man-and-the-masters-of-the-universe-s01', 'he-man-and-the-masters-of-the-universe-s02'],
  'gi-joe': ['gi-joe-1', 'gi-joe-2', 'gi-joe-3'],
  transformers: ['transformers-season-1'],
  'mighty-orbots': ['mighty-orbots'],
  thundercats: ['thundercats_20250306'],
  voltron: ['voltron-lion-force', 'voltron-the-defender-of-the-universe-vehicle-force-1984'],
  mask: ['mask-season-1', 'mask-season-2'],
  silverhawks: ['silverhawks-1986-season-01'],
  'dungeons-dragons': ['dungeons-dragons-1983-s-02-e-01-the-girl-who-dreamed-tomorrow-1080p-hd-upscale'],
  centurions: ['centurions-ep.-58-the-better-half-part-1-480p-dvdrip', 'centurions-premiere-4-7-1986', 'Centurions08DenverIsDown'],
  thundarr: ['thundarr-the-barbarian_202605'],
  'inspector-gadget': ['inspector-gadget-go-go-gadget-series'],
  'spider-friends': ['spider-man-and-his-amazing-friends_202403'],
  'hulk-1982': ['incredible-hulk-1982-cartoon-series'],
  'bionic-six': ['bionic-six-complete'],
  jayce: ['jayce-and-the-wheeled-warriors-e-59'],
  'pole-position': ['pole-position-complete-series-1984'],
  'turbo-teen': ['TurboTeenCollection'],
  bravestarr: ['bravestarr-english'],
  'defenders-earth': ['defenders-of-the-earth-s-01-'],
  'drak-pack': ['hanna-barbera-drak-pack-1980-animated-series'],
  'dragons-lair': ['dragons-lair-complete-series-1984'],
  'speed-buggy': ['speed_buggy_Lando18'],
  'captain-caveman': ['captain-caveman-and-the-teen-angels_202608'],
  'hong-kong-phooey': ['hong-kong-phooey-s-01-e-08-mirror-mirror-on-the-wall-great-movie-mystery'],
  dynomutt: ['dynomutt-dog-wonder_202608'],
  'yogi-bear': ['68-yogis-birthday-party_202109'],
  'galaxy-rangers': ['adventures-of-the-galaxy-rangers-complete-series-1986'],
  visionaries: ['visionaries-knights-of-the-magical-light-s-01-e-13-dawn-of-the-sun-imps'],
  'space-ghost': ['space-ghost-and-dino-boy-complete-series-dvdrip-dolby-digital'],
  galtar: ['Galtar'],
  herculoids: ['the-herculoids_202509'],
  birdman: ['birdman-and-the-galaxy-trio'],
  'jonny-quest': ['jonny-quest-e-07-calcutta-adventure'],
  'super-friends': ['super-friends-1973-season-1'],
  flintstones: ['the-flintstones-s-06-e-01-no-biz-like-show-biz'],
  jetsons: ['the.-jetsons'],
  'wacky-races': ['WackyR'],
  'butch-cassidy': ['butch-cassidy-the-sundance-kids'],
  'clue-club': ['clue.club'],
  goober: ['goober-ghost-chasers'],
  wheelie: ['ep-01-double-cross-country-the-infiltrator-the-stunt-show'],
  'funky-phantom': ['funky-phantom-e-01-dont-fool-with-a-phantom-ai-enhanced'],
  'inch-high': ['inch-high-private-eye-episode-1-diamonds-are-a-crooks-best-friend'],
};
const notes = {
  'he-man': 'Two English original-series season collections; 65 filename-numbered episodes each. Alternate encodes collapsed.',
  'gi-joe': '1983/84 miniseries: season 0, source order 1–10. Source titles explicitly identify regular season 1 (55) and season 2 (30). Movie omitted from episode pack.',
  transformers: 'Only original-series Archive season 1 expanded here. Popular season 2–4 item contains a 30-second download-information placeholder and was excluded. Official YouTube collection is a separate discovery source.',
  'mighty-orbots': 'English collection contains filename-numbered original season 1 episodes. Pilot/extras in an alternate collection omitted.',
  thundercats: 'English original-series collection labels seasons 1–4. Uploader reports chronological reordering; numbering reflects these source filenames, not independently verified broadcast order.',
  voltron: 'Lion Force (72 files) and Vehicle Force (52 files) arcs. Season 0 denotes unknown conventional seasons; station sequence puts Lion Force first, then Vehicle Force. Titles retain arc and source episode number.',
  mask: 'Original 1985 collections explicitly identify seasons 1 and 2; file prefixes identify episode order.',
  silverhawks: 'English 1986 original-series collection; season and episode order from filenames.',
  'dungeons-dragons': 'English original cartoon collection: 27 season/episode-numbered original episodes. Fan-made Requiem finale excluded. An alternative collection had three truncated files and was rejected.',
  centurions: 'Files 5–65 from the main collection and episode 1 from a separate original airing with commercials. Gap episodes 2–4 resolved with clean, explicitly numbered Centurions MP4 files in mixed collection Centurions08DenverIsDown; unrelated Blackstar/Herculoids files excluded. Source typo Allien retained. Season 0 denotes the flat source sequence.',
  thundarr: 'Original-series collection contains source-numbered seasons 1–2.',
  'inspector-gadget': 'English original-series collection: 65 source-numbered season 1 entries and 21 season 2 entries. Alternate upscale collection uses a different pilot numbering convention and was not merged.',
};
notes['spider-friends'] = 'Original cartoon collection contains 24 distinct season/episode-numbered stories (13/3/8). Zero-padded and unpadded duplicate filename encodes collapse by season/episode. The other item titled Full Series lacks several stories and was not needed.';
notes['hulk-1982'] = 'English 1982 animated collection contains 13 filename-numbered stories. The five-second Episode 00 title card is excluded by the runtime filter. Season remains zero because these filenames provide no season.';
Object.assign(notes, {
  'bionic-six': 'English collection: explicit season 1 episodes 1–22 and season 2 episodes 1–43.',
  jayce: 'Collection contains filename-numbered E01–E65. Season zero preserves source sequence without asserting broadcast seasons; source language metadata is absent.',
  'pole-position': 'English collection uses filenames 101–113; interpreted as season 1 episodes 1–13.',
  'turbo-teen': 'Twelve complete episodes: 1–11 and 13. Episode 12 exists only as short clips and is excluded. Uploader identifies episodes 1–5 and 11 as non-English audio with English subtitles; those titles are labeled. Season zero denotes source episode numbering.',
  bravestarr: 'English subset with unnumbered titles. Season zero and stable collection sequence do not establish broadcast order. Duplicate MP4 encodes collapse by title. Other language collections and unmapped whole-disc DVD files are excluded.',
  'defenders-earth': 'Source collection contains explicit season 1 episodes 1–65; language metadata is absent.',
  'drak-pack': 'English collection contains source-numbered episodes 1–16. Season zero retains source numbering; alternate collection with conflicting numbering is not merged.',
  'dragons-lair': 'English original cartoon collection: season 1 episodes 1–13; excludes video game material.',
});
Object.assign(notes, {
  'speed-buggy': 'English collection contains 16 explicitly E-numbered episodes. Season zero denotes the source sequence.',
  'captain-caveman': 'Reviewed collection contains 16 E-numbered original cartoon segments of approximately 11 minutes. Season zero denotes source sequence. Language metadata is absent; this is a partial collection.',
  'hong-kong-phooey': 'Collection contains 16 season/episode-numbered bundles of cartoon stories. Keep each bundle intact; bonus featurettes are excluded. Language metadata is absent.',
  dynomutt: 'Collection has explicit S1 E01–E16 and S2 E01–E04 numbering. Four alternate Blue Falcon filename aliases and derivative MP4 duplicates collapse by explicit season/episode. Language metadata is absent.',
  'yogi-bear': 'Original short collection contains numbered items 1–68, generally seven minutes; the birthday story is longer. Season zero denotes collection order rather than broadcast seasons. Language metadata is absent.',
});
Object.assign(notes, {
  'galaxy-rangers': 'English collection contains 65 Ep.-numbered episodes. Season zero preserves explicit source sequence without asserting broadcast seasons.',
  visionaries: 'English collection contains 13 explicitly numbered season 1 episodes.',
  'space-ghost': 'Twenty bundled programs, each containing three shorts: 18 season 1 bundles and two season 2 bundles. Preserve all three source segment numbers in the title; the first number sorts each intact bundle. The feature-length Alex Toth documentary is excluded. Language metadata is absent.',
  galtar: 'Collection contains 21 explicit season 1 stories; derivative MP4 duplicates collapse. Language metadata is absent.',
  herculoids: 'English collection contains 18 numbered programs, each bundling two stories. Preserve each intact pair; season zero denotes the collection sequence.',
});
Object.assign(notes, {
  birdman: 'English collection: 20 season 1 bundled programs, each preserving its Birdman and Galaxy Trio stories.',
  'jonny-quest': 'Original 1964 series collection: 26 E-numbered episodes. Season zero preserves explicit collection sequence. Language metadata is absent.',
  'super-friends': 'Original 1973 series: 16 S1 EP-numbered programs of approximately 45 minutes. Language metadata is absent.',
  flintstones: 'Reviewed subset: 26 season 6 episodes only. Earlier seasons are not included in this release. Language metadata is absent.',
  jetsons: 'Original series season 1: 24 explicitly numbered stories. Derivative MP4 duplicates collapse. Language metadata is absent.',
  'wacky-races': 'Original 1968 collection contains 17 explicitly numbered season 1 paired-story programs. Preserve complete source paths. Language metadata is absent.',
});
Object.assign(notes, {
  'butch-cassidy': 'Collection contains 13 E-numbered stories. Derivative and filename aliases collapse by source number. Language metadata is absent; season zero denotes source sequence.',
  'clue-club': 'Collection contains 16 explicitly numbered season 1 stories. Language metadata is absent.',
  goober: 'Collection contains 15 E-numbered stories: 1–6 and 8–16. Episode 7 is missing. Language metadata is absent; the Italian collection was not merged.',
  wheelie: 'English collection contains 13 EP-numbered three-story programs. Keep each bundle intact; season zero denotes source program sequence.',
  'funky-phantom': 'English collection contains 17 E-numbered stories, labeled by the uploader as AI-enhanced video. Season zero denotes source sequence.',
  'inch-high': 'English collection contains 13 explicitly Episode-numbered stories. Season zero denotes source sequence.',
});
const runtimeBounds = {
  'captain-caveman': [600, 900],
  'super-friends': [2500, 2900],
  'yogi-bear': [350, 1900],
};
const outputUrl = new URL('../data/cartoon-discovery.json', import.meta.url);
const selected = process.env.CARTOON_SHOWS?.split(',').map(id => id.trim()).filter(Boolean);
if (selected?.some(id => !Object.hasOwn(sources, id))) throw Error('CARTOON_SHOWS contains an unknown show.');
const previous = selected ? JSON.parse(await readFile(outputUrl, 'utf8')) : null;
const cache = process.env.CARTOON_METADATA_CACHE;
async function metadata(id) {
  if (cache) return JSON.parse(await readFile(`${cache}/${id}.json`, 'utf8'));
  const response = await fetch(`https://archive.org/metadata/${id}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Metadata HTTP ${response.status}`);
  return response.json();
}
const allShows = createSeed().shows.filter(show => show.channel === 'cartoons' && sources[show.id]);
const shows = allShows.filter(show => !selected || selected.includes(show.id));
let cursor = 0;
const result = [];
async function worker() {
  while (cursor < shows.length) {
    const show = shows[cursor++];
    const episodes = [], searched = [];
    for (const itemId of sources[show.id]) {
      try {
        const data = await metadata(itemId);
        const imported = archiveEpisodes(itemId, data);
        let retained = 0;
        for (const episode of imported) {
          const source = episode.sources[0];
          const filename = decodeURIComponent(new URL(source.url).pathname).split('/').pop().replace(/(?:\.ia)?\.mp4$/i, '');
          // Exclude other shows in this mixed collection and retain only the identified gap files.
          if (itemId === 'Centurions08DenverIsDown' && !/^Centurions - 0[234] - /.test(filename)) continue;
          if (show.id === 'spider-friends' && !/^Spider-Man and His Amazing Friends Season \d+ Episode \d+/i.test(filename)) continue;
          if (show.id === 'hulk-1982' && !/^Hulk 1982 Episode \d+/i.test(filename)) continue;
          if (show.id === 'turbo-teen' && !/^E\d+\s/.test(filename)) continue;
          // Exclude DVD menus, clips, movies and feature-length compilations.
          if (/fan[ -]made|Requiem/i.test(filename)) continue;
          const [minimum, maximum] = runtimeBounds[show.id] || [1000, 1900];
          if (!episode.durationSeconds || episode.durationSeconds < minimum || episode.durationSeconds > maximum) continue;
          episode.title = filename;
          const order = filename.match(/\bSeason\s+(\d+)\s+Episode\s+(\d+)/i) || filename.match(/\bS(\d+)\s*E(?:P)?(\d+)/i) || filename.match(/\b(\d+)x(\d+)\b/i) || filename.match(/^(\d+)-(\d+)\./);
          if (order) { episode.season = Number(order[1]); episode.number = Number(order[2]); }
          else {
            const number = filename.match(/(?:Episode|Ep\.?)[\s-]*(\d+)/i) || filename.match(/\bE(\d+)\b/i) || filename.match(/^(\d+)\./) || (show.id === 'yogi-bear' ? filename.match(/^(\d+)\s/) : null) || (show.id === 'herculoids' ? filename.match(/^The Herculoids (\d+) -/) : null) || filename.match(/ - (\d+) - /);
            if (!number && !['centurions', 'bravestarr', 'pole-position'].includes(show.id)) continue;
            episode.season = 0;
            episode.number = number ? Number(number[1]) : show.id === 'bravestarr' ? episodes.length + 1 : 1;
            if (itemId === 'gi-joe-2') episode.season = 1;
            if (itemId === 'gi-joe-3') episode.season = 2;
          }
          if (show.id === 'pole-position') {
            const order = filename.match(/^Pole Position (1)(\d{2})\s*-\s*/);
            if (!order) continue;
            episode.season = Number(order[1]); episode.number = Number(order[2]);
          }
          if (['space-ghost', 'wheelie'].includes(show.id)) episode.title += ' · three-story bundle';
          if (show.id === 'herculoids') episode.title += ' · two-story bundle';
          if (show.id === 'turbo-teen' && [1, 2, 3, 4, 5, 11].includes(episode.number)) {
            episode.title += ' · non-English audio / English subtitles';
          }
          if (itemId === 'gi-joe-1') {
            const part = filename.match(/^(\d+)-(\d+)\./);
            if (!part) continue;
            episode.season = 0; episode.number = (Number(part[1]) - 1) * 5 + Number(part[2]);
            episode.group = Number(part[1]) === 1 ? 'The M.A.S.S. Device' : 'The Revenge of Cobra';
          }
          if (show.id === 'voltron') {
            const arc = itemId === 'voltron-lion-force' ? 'Lion Force' : 'Vehicle Force';
            episode.season = 0;
            const number = filename.match(/(?:Episode\s+| - )(\d+)/i);
            if (!number) continue;
            episode.number = Number(number[1]) + (arc === 'Vehicle Force' ? 72 : 0);
            episode.title = `${arc} · ${filename}`;
          }
          if (show.id === 'centurions' && itemId === 'centurions-premiere-4-7-1986') {
            episode.season = 0; episode.number = 1; episode.title = 'The Sky Is Burning · original airing with commercials';
          }
          const hash = createHash('sha256').update(source.url).digest('hex').slice(0, 20);
          episode.id = `cartoon-${show.id}-${hash}`;
          source.id = `archive-${hash}`;
          episodes.push(episode); retained++;
        }
        searched.push({ provider: 'archive', itemId, url: `https://archive.org/details/${itemId}`, title: String(data.metadata.title), language: data.metadata.language || null, retained });
      } catch (error) { searched.push({ provider: 'archive', itemId, error: error.message }); }
    }
    const seen = new Set();
    const unique = episodes.filter(episode => { const key = `${episode.season}:${episode.number}`; if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => a.season - b.season || a.number - b.number);
    result.push({ showId: show.id, title: show.title, episodes: unique, searched, notes: notes[show.id] });
    console.log(`${show.id}: ${unique.length}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
if (selected && result.some(show => !show.episodes.length)) throw Error('Partial refresh found an empty show; previous discovery pack is unchanged.');
if (previous) result.push(...previous.shows.filter(show => !selected.includes(show.showId)));
result.sort((a, b) => allShows.findIndex(s => s.id === a.showId) - allShows.findIndex(s => s.id === b.showId));
const output = { checkedAt: new Date().toISOString(), provider: 'archive', scope: 'Reviewed original-series public MP4 metadata collections. Partial refreshes preserve earlier records; updatedShows identifies the refreshed records. Search initially inspected up to 100 download-ranked title matches per show; not exhaustive internet availability or rights verification. Public source metadata does not establish browser decoding or future availability.', shows: result, ...(previous ? { previousCheckedAt: previous.checkedAt, updatedShows: selected } : {}) };
await writeFile(outputUrl, JSON.stringify(output, null, 2) + '\n');

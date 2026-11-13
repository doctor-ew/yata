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
const cache = process.env.CARTOON_METADATA_CACHE;
async function metadata(id) {
  if (cache) return JSON.parse(await readFile(`${cache}/${id}.json`, 'utf8'));
  const response = await fetch(`https://archive.org/metadata/${id}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`Metadata HTTP ${response.status}`);
  return response.json();
}
const shows = createSeed().shows.filter(show => show.channel === 'cartoons' && sources[show.id]);
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
          // Exclude DVD menus, clips, movies and feature-length compilations.
          if (/fan[ -]made|Requiem/i.test(filename)) continue;
          if (!episode.durationSeconds || episode.durationSeconds < 1000 || episode.durationSeconds > 1900) continue;
          episode.title = filename;
          const order = filename.match(/\bS(\d+)\s*E(\d+)/i) || filename.match(/\b(\d+)x(\d+)\b/i) || filename.match(/^(\d+)-(\d+)\./);
          if (order) { episode.season = Number(order[1]); episode.number = Number(order[2]); }
          else {
            const number = filename.match(/(?:Episode|Ep\.?)[\s-]*(\d+)/i) || filename.match(/^(\d+)\./) || filename.match(/ - (\d+) - /);
            if (!number && show.id !== 'centurions') continue;
            episode.season = 0;
            episode.number = number ? Number(number[1]) : 1;
            if (itemId === 'gi-joe-2') episode.season = 1;
            if (itemId === 'gi-joe-3') episode.season = 2;
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
result.sort((a, b) => shows.findIndex(s => s.id === a.showId) - shows.findIndex(s => s.id === b.showId));
const output = { checkedAt: new Date().toISOString(), provider: 'archive', scope: 'Reviewed original-series public MP4 metadata collections for all 12 cartoon shows. Search initially inspected up to 100 download-ranked title matches per show; not exhaustive internet availability or rights verification. Public source metadata does not establish browser decoding or future availability.', shows: result };
await writeFile(new URL('../data/cartoon-discovery.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');

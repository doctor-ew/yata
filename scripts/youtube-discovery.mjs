// Metadata-only public YouTube discovery. Existing catalogs are not mutated.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir, readFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateCatalog } from '../src/domain.mjs';
import { createSeed } from '../src/catalog.mjs';
import { youtubeEpisodes } from '../src/bulk.mjs';
const run = promisify(execFile);
const root = new URL('../data/', import.meta.url);
await mkdir(root, { recursive: true });
// Curation is required before any discovery or final manifest replacement.
// Leave the previous curated artifact intact when canonical input is missing or malformed.
const canonicalArchive = JSON.parse(await readFile(new URL('cartoon-discovery.json', root), 'utf8'));
for (const showId of ['he-man', 'gi-joe']) {
 const episodes = canonicalArchive?.shows?.find(s => s.showId === showId)?.episodes;
 if (!Array.isArray(episodes) || !episodes.length) throw Error(`Canonical Archive episode list is required for ${showId}; existing curated manifest is unchanged.`);
}
const progressPath = path.join(tmpdir(), `drew-youtube-discovery-progress-${process.pid}.json`);
const records = createSeed().shows.filter(s => s.id !== 'saturday-simulator').map(s => ({ showId: s.id, title: s.title, episodes: [], searched: [], notes: [] }));
async function metadata(url, limit = 200) {
 const { stdout } = await run('yt-dlp', ['--ignore-config', '--flat-playlist', '--skip-download', '--dump-single-json', '--playlist-end', String(limit), '--socket-timeout', '10', '--retries', '0', '--', url], { timeout: 60000, maxBuffer: 16000000 });
 return JSON.parse(stdout);
}
const byShow = id => records.find(r => r.showId === id);
const seen = new Set();
function add(record, entries, season = null) {
 for (let index = 0; index < entries.length; index++) {
  const e = entries[index];
  if (!e?.id || !e.title || !e.duration || e.duration < 1100 || e.duration > 3900 || /compilation|watch.?along|live 24|double bill|2 full episodes|two full episodes|3 full episodes/i.test(e.title)) continue;
  if (seen.has(e.id)) continue;
  try {
   const episode = youtubeEpisodes(e)[0];
   episode.id = `youtube-${record.showId}-${e.id}`;
   if (episode.season === 0) episode.number = record.episodes.length + 1;
   record.episodes.push(episode); seen.add(e.id);
  } catch {}
 }
}
const playlists = [
 ['he-man', 'https://www.youtube.com/playlist?list=PLLCcmBcBRcT8MwyYwiydNddtZPSSV_iQs', 1],
 ['he-man', 'https://www.youtube.com/playlist?list=PLLCcmBcBRcT_UJXI8UW_wLM2xthxoCkYj', 2],
 ['transformers', 'https://www.youtube.com/playlist?list=PLD3dCMp2WHixUHTv2TETDETzoB148KoPy', null],
 ['gi-joe', 'https://www.youtube.com/playlist?list=PLD3dCMp2WHiybR7JHPrZjLN21YZLTmM3T', null],
];
for (const [id, url, season] of playlists) {
 const r = byShow(id); r.searched.push(url);
 try { const data = await metadata(url, 1000); await writeFile(`/tmp/drew-youtube-${id}-${season}.json`, JSON.stringify(data)); add(r, data.entries || [], season); r.notes.push(`Playlist returned ${(data.entries || []).length} entries; individual 18–65 minute candidates retained. Playlist labels are not used to infer episode numbering; entries without explicit numbering remain season 0.`); }
 catch (error) { r.notes.push(`Playlist discovery failed: ${error.killed ? 'timeout' : 'provider unavailable'}.`); }
}
const approvedChannels = new Set(['Hasbro Pulse', 'Hasbro', 'Masters of the Universe: He-Man & She-Ra', 'NBC Classics']);
let cursor = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
 while (cursor < records.length) {
  const r = records[cursor++], query = `${r.title} original full episodes`;
  r.searched.push(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
  try {
   const data = await metadata(`ytsearch40:${query}`, 40);
   const all = data.entries || [], approved = all.filter(e => approvedChannels.has(e.channel));
   // Brand channel search is broad; retain only title matches for this series.
   const words = r.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => !['the','and','of','a','in','to','real','american'].includes(w));
   const matched = approved.filter(e => r.showId === 'gi-joe' ? /g[. ]*i[. ]*joe/i.test(e.title) : r.showId === 'he-man' ? /he.?man/i.test(e.title) : words.length && words.every(w => e.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').includes(w)));
   add(r, matched);
   r.notes.push(`Search inspected ${all.length} results; only individually titled episodes from explicitly approved brand channels retained. Search is not exhaustive.`);
  } catch { r.notes.push('Public search failed or timed out. No availability conclusion.'); }
  console.log(r.showId, r.episodes.length);
  await writeFile(progressPath, JSON.stringify({ checkedAt: new Date().toISOString(), provider: 'youtube', limits: 'Public season playlists up to 1,000 entries; top 40 search results per show; only approved brand channels. Embedded playback not checked. Only explicit title numbering is used; unknown season is zero.', shows: records }, null, 2));
 }
}));

// Channel playlists contain repeated recuts; merge exact normalized episode-title matches.
function episodeName(title, showId) {
 const parts = title.split('|').map(s => s.trim());
 if (showId === 'he-man') {
  const named = parts.find(s => s && !/he.?man|masters of the universe|full episodes?|cartoons?|official|first ever episode|compilation|videos? for/i.test(s));
  if (named) return named;
  return title.replace(/^he[ -]?man(?:\s+official)?\s*[-:|]?\s*/i, '').replace(/\s*[-|]?\s*full episodes?.*$/i, '').trim();
 }
 return parts[0].replace(/\s*[-|]?\s*full episodes?.*$/i, '').trim();
}
for (const record of records) {
 const groups = new Map();
 for (const episode of record.episodes) {
  if (record.showId === 'he-man' && /she.?ra|christmas|new adventures|2002|2021|revelation|revolution|compilation|double|2 episodes|2 full|two full/i.test(episode.title)) continue;
  if (record.showId === 'gi-joe' && /renegades|sigma|resolute|valor/i.test(episode.title)) continue;
  if (episode.sources[0].url.endsWith('9PfiA1wWaBo')) continue;
  const name = episodeName(episode.title, record.showId);
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!key || key.length < 4) continue;
  const known = groups.get(key);
  if (known) {
   if (known.sources.length < 20) known.sources.push(...episode.sources);
  } else { episode.title = name; groups.set(key, episode); }
 }
 record.episodes = [...groups.values()];
 record.episodes.forEach((e, index) => { if (e.season === 0) e.number = index + 1; });
 record.notes.push('Repeated official-channel recuts sharing an exact normalized episode title are grouped as alternative sources. Unknown season remains zero. Title matching is conservative and can leave ambiguous duplicates. Known failed G.I. Joe embed candidate excluded.');
}
await writeFile(progressPath, JSON.stringify({ checkedAt: new Date().toISOString(), provider: 'youtube', limits: 'Public season playlists up to 1,000 entries; top 40 search results per show; explicitly approved brand channels only. Embedded playback not checked. Only explicit title numbering is used; unknown season is zero. All sources remain unverified.', shows: records }, null, 2));
console.log('FINAL', records.filter(s => s.episodes.length).map(s => [s.showId, s.episodes.length]));

// Where Archive supplies canonical He-Man episode titles, attach only exact title matches.
// Descriptive retitles and commentary recuts are excluded rather than guessed.
{
 const archive = canonicalArchive;
 const canonical = archive.shows.find(s => s.showId === 'he-man')?.episodes || [];
 const key = value => value.toLowerCase().replace(/^(?:the|a)\s+/, '').replace(/[^a-z0-9]/g, '');
 const mapping = new Map(canonical.map(e => [key(e.title.split(' - ').slice(2).join(' - ')), e]));
 const heman = byShow('he-man'), grouped = new Map(); let excluded = 0;
 for (const episode of heman.episodes) {
  if (/commentary|special|1\+2/i.test(episode.title)) { excluded++; continue; }
  let name = episode.title.split('|')[0].trim();
  let match = mapping.get(key(name));
  if (!match) match = mapping.get(key(name.replace(/he[ -]?man(?:\s+full.*)?$/i, '').trim()));
  if (!match) { excluded++; continue; }
  const id = `${match.season}:${match.number}`;
  const existing = grouped.get(id);
  if (existing) existing.sources = [...existing.sources, ...episode.sources].slice(0, 20);
  else grouped.set(id, { ...episode, title: match.title, season: match.season, number: match.number });
 }
 heman.episodes = [...grouped.values()];
 heman.notes.push(`Matched ${heman.episodes.length} canonical episode titles against the independently discovered Archive original-series filename list. Excluded ${excluded} ambiguous retitles/commentaries/specials. Season and episode numbers copied only from an exact canonical title match.`);
 await writeFile(progressPath, JSON.stringify({ checkedAt: new Date().toISOString(), provider: 'youtube', limits: 'Public season playlists up to 1,000 entries; top 40 search results per show; approved brand channels. Embedded playback not checked. Unknown season is zero. He-Man uses exact canonical title matching against Archive filenames; unmatched retitles excluded.', shows: records }, null, 2));
}
// G.I. Joe miniseries numbering differs between provider catalogs. Do not merge conflicting S/E labels.
{
 const archive = canonicalArchive;
 const canonical = archive.shows.find(s => s.showId === 'gi-joe')?.episodes || [];
 const norm = title => title.toLowerCase().replace(/^\d+(?:-\d+)?\.\s*/, '').replace(/^(the|a)\s+/, '').replace(/[^a-z0-9]/g, '');
 const joe = byShow('gi-joe');
 joe.episodes = joe.episodes.filter(e => !/fanstream|inside|energon|interview|unboxing|haslab|panel|reveal|comic/i.test(e.title));
 for (const [index, episode] of joe.episodes.entries()) {
  const match = canonical.find(e => e.season === episode.season && e.number === episode.number && norm(e.title) === norm(episode.title));
  if (!match) { episode.season = 0; episode.number = index + 1; }
 }
 joe.notes.push('Removed non-episode fanstream/interview videos. G.I. Joe source numbering conventions conflict for original miniseries; positive S/E retained only if both number and normalized title agree with Archive. Conflicting entries remain season zero.');
 await writeFile(progressPath, JSON.stringify({ checkedAt: new Date().toISOString(), provider: 'youtube', limits: 'Public season playlists up to 1,000 entries; top 40 search results per show; approved brand channels. Embedded playback not checked. Unknown season is zero. He-Man exact canonical title matching against Archive filenames; unmatched retitles excluded.', shows: records }, null, 2));
}

// Validate the complete curated payload before atomically publishing it.
const validationCatalog = createSeed();
for (const record of records) validationCatalog.shows.find(s => s.id === record.showId).episodes = record.episodes;
validateCatalog(validationCatalog);
const artifact = { curated: true, checkedAt: new Date().toISOString(), provider: 'youtube',
 limits: 'Public season playlists up to 1,000 entries; top 40 search results per show; approved brand channels. Embedded playback not checked. Unknown season is zero. He-Man exact canonical title matching against Archive filenames; unmatched retitles excluded.', shows: records };
const finalPath = new URL('youtube-discovery.json', root);
const temporaryPath = new URL(`youtube-discovery.json.${process.pid}.tmp`, root);
await writeFile(temporaryPath, JSON.stringify(artifact, null, 2) + '\n');
await rename(temporaryPath, finalPath);
console.log('CURATED', records.filter(s => s.episodes.length).map(s => [s.showId, s.episodes.length]));

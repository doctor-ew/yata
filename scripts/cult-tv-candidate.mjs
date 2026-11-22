// Apply the reviewed additions to their exact authoritative base; never publish here.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateCatalog } from '../src/domain.mjs';
import { catalogCounts } from '../src/published-catalog.mjs';

const [baseFile, outputFile] = process.argv.slice(2);
if (!baseFile || !outputFile) throw Error('Provide the authoritative base snapshot and a new output path.');
const pack = JSON.parse(await readFile(new URL('../data/cult-tv-selections.json', import.meta.url), 'utf8'));
const text = await readFile(baseFile, 'utf8');
if (createHash('sha256').update(text).digest('hex') !== pack.baseRevision) {
  throw Error('Base revision changed. Review additions against the current published snapshot first.');
}
const catalog = validateCatalog(JSON.parse(text));
const before = JSON.stringify(catalog.shows);
const ids = new Set(catalog.shows.map(show => show.id));
for (const show of pack.shows) {
  if (ids.has(show.id) || catalog.shows.some(existing => existing.title.toLowerCase() === show.title.toLowerCase())) {
    throw Error(`Review duplicate show before merging: ${show.title}`);
  }
  ids.add(show.id);
  catalog.shows.push(structuredClone(show));
}
const validated = validateCatalog(catalog);
if (JSON.stringify(validated.shows.slice(0, -pack.shows.length)) !== before) {
  throw Error('Existing catalog records changed.');
}
await writeFile(outputFile, JSON.stringify(validated) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ published: false, baseRevision: pack.baseRevision, addedShows: pack.shows.length, counts: catalogCounts(validated) }, null, 2));

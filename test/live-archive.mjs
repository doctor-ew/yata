// Explicit opt-in live check. The regular test suite does not require provider access.
import assert from 'node:assert/strict';
import { createSeed } from '../src/catalog.mjs';
import { importArchive, validateCatalog } from '../src/domain.mjs';

const catalog = createSeed();
const episodes = await importArchive('https://archive.org/details/the-dukes-of-hazzard-s-01-e-05-high-octane');
assert(episodes.length > 0);
catalog.shows.find(show => show.id === 'dukes').episodes = episodes;
validateCatalog(catalog);
const video = episodes[0];
assert(video.durationSeconds > 0);
const response = await fetch(video.sources[0].url, {
  headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(15000),
});
try {
  assert.equal(response.status, 206);
  assert.match(response.headers.get('content-type'), /^video\/mp4/);
} finally { await response.body?.cancel(); }
console.log(`Archive live check passed: ${episodes.length} imported video item(s), valid catalog, positive runtime, MP4 byte range served. Browser decoding is a separate check.`);

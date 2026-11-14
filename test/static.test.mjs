import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
test('static release supports a subpath and excludes server and development files', async () => {
 const output = await mkdtemp(path.join(tmpdir(), 'drew-tv-static-test-'));
 try {
  await run(process.execPath, ['scripts/build-static.mjs', '--out', output, '--base', '/tv/'], { cwd: new URL('..', import.meta.url) });
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /<body class="public-view">/);
  assert.match(html, /<base href="\/tv\/">/); assert.match(html, /name="drew-tv-hosting" content="static"/);
  const manifest = JSON.parse(await readFile(path.join(output, 'release-manifest.json'), 'utf8'));
  assert.ok(manifest.files.some(file => file.name === 'data/expanded-catalog.json'));
  assert.ok(manifest.files.some(file => file.name === 'data/commercials-discovery.json'));
  assert.ok(manifest.files.some(file => file.name === 'LICENSE.txt'));
  assert.ok(manifest.files.some(file => file.name === 'ATTRIBUTION.md'));
  assert.ok(manifest.files.some(file => file.name === 'src/retro-effects.mjs'));
  assert.ok(manifest.files.some(file => file.name === 'src/catalog-store.mjs'));
  assert.ok(manifest.files.some(file => file.name === 'src/exclusions.mjs'));
  assert.ok(manifest.files.every(file => path.basename(file.name).includes('.')));
  assert.ok(manifest.files.filter(file => file.name.endsWith('.mjs')).every(file => file.contentType.startsWith('text/javascript')));
  assert.ok(manifest.files.every(file => !/server|scripts\/|test\/|youtube-metadata/.test(file.name)));
  await assert.rejects(run(process.execPath, ['scripts/build-static.mjs', '--out', output, '--base', '/tv/'], { cwd: new URL('..', import.meta.url) }));
 } finally { await rm(output, { recursive: true, force: true }); }
});

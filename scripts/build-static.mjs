import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
if (!args.includes('--out')) throw Error('Provide --out with an empty output directory.');
const output = path.resolve(value('--out'));
const base = args.includes('--base') ? value('--base') : '/tv/';
if (!/^\/(?:[a-z0-9-]+\/)+$/.test(base)) throw Error('Use a slash-terminated base path, for example /tv/.');
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw Error('The output directory must be empty.');
const content = new Map();
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace('<head>', `<head>\n  <base href="${base}">\n  <meta name="drew-tv-hosting" content="static">`);
content.set('index.html', html);
content.set('style.css', await readFile(path.join(root, 'style.css')));
for (const name of await readdir(path.join(root, 'src'))) {
  if (name.endsWith('.mjs')) content.set(`src/${name}`, await readFile(path.join(root, 'src', name)));
}
for (const name of ['action-discovery.json', 'cartoon-discovery.json', 'youtube-discovery.json', 'library-manifest.json', 'expanded-catalog.json']) {
  content.set(`data/${name}`, await readFile(path.join(root, 'data', name)));
}
content.set('LICENSE.txt', await readFile(path.join(root, '..', 'LICENSE')));
content.set('README.md', `# Drew TV\n\nA personal nostalgia station. The curated episode library loads automatically and preserves your catalog in this browser. Export your catalog to back it up or move it between devices. Catalogs are not synchronized automatically.\n\nPlayback comes from Internet Archive or the official YouTube player. Tubi opens at its original page. Availability, regional restrictions, ads and browser autoplay can affect playback. Source discovery is not a completeness or future-playback guarantee.\n\nThis static hosted version supports the curated library, Archive metadata imports and direct YouTube video/playlist playback. Expanding an arbitrary YouTube playlist into individual episodes requires the local importer and export/import.\n\nSource and full coverage: https://github.com/doctor-ew/floating-browser/tree/nightshift/4\n\nBased on Floating Browser by Chris Hansen, MIT license preserved in LICENSE.txt. Channel scheduling was inspired by Old Time Radio by Rob Dawson; implementation independently written. Media and show names belong to their respective providers/owners.\n`);
const mime = name => name.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : name.endsWith('.json') ? 'application/json; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
const files = [];
for (const [name, value] of content) {
  await mkdir(path.dirname(path.join(output, name)), { recursive: true });
  await writeFile(path.join(output, name), value);
  files.push({ name, contentType: mime(name), bytes: Buffer.byteLength(value), sha256: createHash('sha256').update(value).digest('hex') });
}
const manifest = { base, files };
await writeFile(path.join(output, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output, files: files.length, bytes: files.reduce((n, file) => n + file.bytes, 0), base }));

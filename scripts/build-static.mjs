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
html = html.replace('<body>', '<body class="public-view public-catalog-pending">');
content.set('index.html', html);
content.set('style.css', await readFile(path.join(root, 'style.css')));
for (const name of await readdir(path.join(root, 'src'))) {
  if (name.endsWith('.mjs')) content.set(`src/${name}`, await readFile(path.join(root, 'src', name)));
}
for (const name of ['action-discovery.json', 'cartoon-discovery.json', 'youtube-discovery.json', 'commercials-discovery.json', 'scifi-discovery.json', 'movies-discovery.json', 'comedy-discovery.json', 'benson-discovery.json', 'cartoon-extras-discovery.json', 'stephanie-cartoons-discovery.json', 'late-night-discovery.json', 'seventies-discovery.json', 'library-manifest.json', 'expanded-catalog.json']) {
  content.set(`data/${name}`, await readFile(path.join(root, 'data', name)));
}
content.set('LICENSE.txt', await readFile(path.join(root, '..', 'LICENSE')));
content.set('ATTRIBUTION.md', await readFile(path.join(root, 'ATTRIBUTION.md')));
content.set('README.md', `# YATA — Yet Another TV App\n\nCreated by Drew Schillinger: [GitHub](https://github.com/doctor-ew) · [CTO2GO](https://cto2go.co) · [doctorew.com](https://doctorew.com).\n\nA personal nostalgia station. TV Guide shows the actual full-channel station schedules beside Library, with local-time windows, commercial blocks, live tuning and episode starts. The shared published catalog loads automatically from an immutable JSON snapshot selected by its manifest. Legacy browser catalogs remain recoverable through read-only backup export; personal tuning preferences are separate. The public site is a viewer: catalog editor and seeding tools are available only in the loopback owner app. Browser-copy edits cannot publish shared catalog changes. Owner drafts use revision-checked IndexedDB transactions; older browser catalogs remain untouched for recovery. Without transactional browser storage, the owner catalog is read-only. Playback and tuning remain available. Owner publication updates the shared master; personal preferences remain browser-local. SET UP on the retro remote beneath the TV opens an overlay where you can choose a 70s/80s/90s TV cabinet, adjust static, and choose fixed or random commercial break lengths. Use Share episode beside the player, with Include position for timestamp links.\n\nPlayback comes from Internet Archive or the official YouTube player. Tubi opens at its original page. Availability, regional restrictions, ads and browser autoplay can affect playback. Source discovery is not a completeness or future-playback guarantee.\n\nThis static hosted version requires a verified shared master. A failed fresh load offers retry without factory source playback; a failed refresh retains the verified current edition. Existing Archive and YouTube sources play through their providers. Catalog editing, discovery, and import/export management belong to the loopback owner workflow. Expanding an arbitrary YouTube playlist into individual episodes requires the local importer and export/import.\n\nSource and full coverage: https://github.com/doctor-ew/floating-browser/tree/feature/classic-cartoon-additions\n\nBased on Floating Browser by Chris Hansen, MIT license preserved in LICENSE.txt. Channel scheduling was inspired by Old Time Radio by Rob Dawson; implementation independently written. Media and show names belong to their respective providers/owners. Vintage commercial breaks are independently implemented, inspired by Nikolay1243/retro-tv-webos (https://github.com/Nikolay1243/retro-tv-webos) and Joey Cato’s MyRetroTVs (https://www.myretrotvs.com/).\n`);
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

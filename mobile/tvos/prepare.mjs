import {readFile, writeFile, mkdir, cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(root, '../www/tv');
const text = await readFile(path.join(web, 'data/published-catalog-v2-manifest.json'), 'utf8');
const manifest = JSON.parse(text);
if (!/^[a-f0-9]{64}$/.test(manifest.revision) || manifest.catalog !== `data/catalogs/${manifest.revision}.json`) throw Error('Invalid published manifest');
const data = await readFile(path.join(web, manifest.catalog));
if (createHash('sha256').update(data).digest('hex') !== manifest.revision) throw Error('Catalog integrity check failed');
await mkdir(path.join(root, 'Catalog'), {recursive:true});
await writeFile(path.join(root, 'Catalog/manifest.json'), text);
await writeFile(path.join(root, 'Catalog/catalog.json'), data);
await mkdir(path.join(root, 'Notices'), {recursive:true});
for (const name of ['LICENSE', 'ATTRIBUTION.md']) await cp(path.resolve(root, '../..', name), path.join(root, 'Notices', name));
console.log(`Apple TV bundled catalog verified: ${manifest.revision}`);

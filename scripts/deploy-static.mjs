import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(new URL('../deploy/aws-static.json', import.meta.url), 'utf8'));
const aws = async args => JSON.parse((await run('aws', [...args, '--region', config.region, '--output', 'json'], { maxBuffer: 2_000_000 })).stdout);
const identity = await aws(['sts', 'get-caller-identity']);
if (identity.Account !== config.account) throw Error('AWS account does not match the deployment configuration.');
const distribution = await aws(['cloudfront', 'get-distribution-config', '--id', config.distribution]);
if (!distribution.DistributionConfig.Aliases.Items.includes(new URL(config.url).hostname)) throw Error('CloudFront aliases do not match the target hostname.');
const output = await mkdtemp(path.join(tmpdir(), 'drew-tv-static-'));
await run(process.execPath, ['scripts/build-static.mjs', '--out', output, '--base', config.base], { cwd: root });
const manifest = JSON.parse(await readFile(path.join(output, 'release-manifest.json'), 'utf8'));
const uploads = [];
// Upload imported modules before the coordinator, then expose the new HTML.
const uploadOrder = name => name === 'index.html' ? 2 : name === 'src/app.mjs' ? 1 : 0;
for (const file of manifest.files.sort((a, b) => uploadOrder(a.name) - uploadOrder(b.name))) {
 const key = config.base.slice(1) + file.name;
 const result = await aws(['s3api', 'put-object', '--bucket', config.bucket, '--key', key, '--body', path.join(output, file.name),
  '--content-type', file.contentType, '--cache-control', file.name === 'index.html' ? 'no-cache, max-age=0' : 'public, max-age=300', '--metadata', `sha256=${file.sha256}`]);
 uploads.push({ key, etag: result.ETag, versionId: result.VersionId });
 console.log(`Uploaded ${key}`);
}
const invalidation = await aws(['cloudfront', 'create-invalidation', '--distribution-id', config.distribution, '--paths', config.base.slice(0, -1), `${config.base}*`]);
const receipt = { url: config.url, uploadedAt: new Date().toISOString(), uploads, invalidation: invalidation.Invalidation.Id };
const receiptFile = path.join(output, 'deployment-receipt.json');
await writeFile(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ ...receipt, receiptFile }));

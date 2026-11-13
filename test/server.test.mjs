import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('loopback discovery rejects foreign browser requests and unsupported URLs before process execution', async () => {
  const child = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const address = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Server startup timed out')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    const endpoint = `${address}/api/youtube?url=${encodeURIComponent('https://example.com')}`;
    assert.equal((await fetch(endpoint, { headers: { Origin: 'https://example.com' } })).status, 403);
    assert.equal((await fetch(endpoint, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    const invalid = await fetch(endpoint);
    assert.equal(invalid.status, 400); assert.match((await invalid.json()).error, /Supported sources/);
    assert.equal((await fetch(endpoint, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${address}/src/bulk.mjs`)).status, 200);
    assert.equal((await fetch(`${address}/%2e%2e%2fAGENTS.md`)).status, 404);
  } finally { child.kill(); await once(child, 'exit'); }
});

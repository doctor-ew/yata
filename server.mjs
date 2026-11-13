import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    if (relative.includes('\0') || relative.split('/').some(part => part.startsWith('.'))) throw Error('Not found');
    const target = await realpath(path.join(root, relative));
    if (!target.startsWith(root) || !types[path.extname(target)]) throw Error('Not found');
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-store',
      'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Drew TV → http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './database.mjs';
import { handleApi } from './service.mjs';
const root = path.resolve(fileURLToPath(new URL('../frontend/', import.meta.url)));
const db = openDatabase(process.env.FINDBACK_DB || new URL('./data/findback.db', import.meta.url));
const port = Number(process.env.PORT || 5180);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith('/api/')) {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 400000) { res.writeHead(413); res.end('Request too large'); return; } chunks.push(chunk); }
      const response = await handleApi(new Request(url, { method: req.method, headers: req.headers, ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}) }), { DB: db, DEMO_MODE: process.env.DEMO_MODE || 'true' });
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filename = path.resolve(root, `.${relative}`);
    if (!filename.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const data = await fs.readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`FindBack: http://127.0.0.1:${port}`));
process.on('SIGINT', () => server.close(() => { db.close(); process.exit(0); }));

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3456);
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function typeFor(file) {
  if (file.endsWith('.wasm.br')) return 'application/wasm';
  if (file.endsWith('.js.br')) return 'application/javascript';
  if (file.endsWith('.data.br')) return 'application/octet-stream';
  return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = clean === '/' ? '/index.html' : clean;
  const resolved = path.normalize(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  req.socket.setTimeout(0);
  try {
    let file = safePath(req.url || '/');
    if (!file) {
      res.writeHead(400).end();
      return;
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        if (!err && st.isDirectory()) {
          file = path.join(file, 'index.html');
        } else {
          res.writeHead(404).end('Not found');
          return;
        }
      }
      fs.stat(file, (err2, st2) => {
        if (err2 || !st2.isFile()) {
          res.writeHead(404).end('Not found');
          return;
        }
        const headers = {
          'Content-Type': typeFor(file),
          'Content-Length': st2.size,
          Connection: 'close',
        };
        if (file.endsWith('.br')) headers['Content-Encoding'] = 'br';
        if (/\.(html|js|css)$/i.test(file) || file.includes('SaveBruge')) {
          headers['Cache-Control'] = 'no-store, max-age=0';
        }
        res.writeHead(200, headers);
        const stream = fs.createReadStream(file);
        stream.on('error', () => {
          try { res.destroy(); } catch { /* ignore */ }
        });
        req.on('aborted', () => stream.destroy());
        stream.pipe(res);
      });
    });
  } catch {
    try { res.writeHead(500).end(); } catch { /* ignore */ }
  }
});

server.keepAliveTimeout = 0;
server.headersTimeout = 10_000;
server.requestTimeout = 0;
server.maxConnections = 128;

server.listen(PORT, HOST, () => {
  console.log(`Serving portfolio at http://${HOST}:${PORT}`);
  console.log('Unity .br files are served with Content-Encoding: br');
  console.log('Press Ctrl+C to stop.');
});

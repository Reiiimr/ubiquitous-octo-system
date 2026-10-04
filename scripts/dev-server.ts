/* Local development server: serves the static prototype AND the /api functions, like Vercel does.
   Usage:  npm run dev:local     (reads .env.local; open http://localhost:3000/login.html) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { dispatchApi } from '../server/api-dispatch';

try { process.loadEnvFile('.env.local'); } catch { /* use real environment variables */ }

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT ?? 3000);

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    return void await dispatchApi(req, res);
  }
  let file = path.join(process.cwd(), decodeURIComponent(url.pathname === '/' ? '/login.html' : url.pathname));
  if (!file.startsWith(process.cwd()) || /^[\\/](server|api|api-handlers|tests|scripts|db|docs|node_modules)([\\/]|$)|^[\\/]\.env/.test(file.slice(process.cwd().length)) ) { res.statusCode = 404; return void res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return void res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream'); res.end(buf);
  });
}).listen(port, () => console.log(`e-Kapon dev server: http://localhost:${port}/login.html`));

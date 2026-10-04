/* Local development server: serves the static prototype AND the /api functions, like Vercel does.
   Usage:  npm run dev:local     (reads .env.local; open http://localhost:3000/login.html) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

try { process.loadEnvFile('.env.local'); } catch { /* use real environment variables */ }

interface RouteDef { re: RegExp; names: string[]; file: string; dynamic: number }
function scan(dir: string, rel = ''): RouteDef[] {
  const out: RouteDef[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...scan(full, rel + '/' + e.name)); continue; }
    if (!e.name.endsWith('.ts')) continue;
    let p = rel + '/' + e.name.replace(/\.ts$/, '');
    if (p.endsWith('/index')) p = p.slice(0, -6) || '/';
    const names: string[] = [];
    const re = '^' + p.replace(/\[([^\]]+)\]/g, (_m, n) => { names.push(n); return '([^/]+)'; }) + '$';
    out.push({ re: new RegExp(re), names, file: path.resolve(full), dynamic: names.length });
  }
  return out;
}

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const routes = scan(path.resolve('api'), '/api').sort((a, b) => a.dynamic - b.dynamic);
const port = Number(process.env.PORT ?? 3000);

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    for (const r of routes) {
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      (req as any).query = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      return (await import(pathToFileURL(r.file).href)).default(req, res);
    }
    res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return void res.end('{"error":{"code":"NOT_FOUND","message":"Not found."}}');
  }
  let file = path.join(process.cwd(), decodeURIComponent(url.pathname === '/' ? '/login.html' : url.pathname));
  if (!file.startsWith(process.cwd()) || /^[\\/](server|api|tests|scripts|db|docs|node_modules)([\\/]|$)|^[\\/]\.env/.test(file.slice(process.cwd().length)) ) { res.statusCode = 404; return void res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return void res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream'); res.end(buf);
  });
}).listen(port, () => console.log(`e-Kapon dev server: http://localhost:${port}/login.html`));

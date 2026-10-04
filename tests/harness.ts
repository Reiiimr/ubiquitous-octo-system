import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

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

/** Minimal stand-in for Vercel's file-system routing, so the real handlers run unchanged in tests. */
export async function startServer() {
  const routes = scan(path.resolve('api'), '/api').sort((a, b) => a.dynamic - b.dynamic);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    for (const r of routes) {
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      (req as any).query = Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const mod = await import(r.file);
      return mod.default(req, res);
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { base, close: () => new Promise<void>((ok) => server.close(() => ok())) };
}

export interface Resp { status: number; json: any; cookie: string | null; setCookie: string | null; headers: Headers }

export function client(base: string) {
  return async (method: string, p: string, o: { json?: unknown; cookie?: string | null; origin?: string; ip?: string } = {}): Promise<Resp> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Origin: o.origin ?? base };
    if (o.cookie) headers.Cookie = o.cookie;
    if (o.ip) headers['x-real-ip'] = o.ip;
    const r = await fetch(base + p, { method, headers, body: o.json === undefined ? undefined : JSON.stringify(o.json) });
    const text = await r.text();
    const sc = r.headers.getSetCookie()[0] ?? null;
    return { status: r.status, json: text ? JSON.parse(text) : null, cookie: sc ? sc.split(';')[0] : null, setCookie: sc, headers: r.headers };
  };
}

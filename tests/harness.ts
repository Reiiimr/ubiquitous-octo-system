import http from 'node:http';
import { dispatchApi } from '../server/api-dispatch';

/** Exercises the same consolidated dispatcher used by the Vercel function. */
export async function startServer() {
  const server = http.createServer(async (req, res) => {
    await dispatchApi(req, res);
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

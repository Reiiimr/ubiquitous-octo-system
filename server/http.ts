import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { config } from './config';
import { AppError, badRequest, fromDb } from './errors';

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type Req = IncomingMessage & { query?: Record<string, string | string[]>; body?: unknown; appFeature?: string };

export class Reply {
  constructor(public status: number, public body: unknown, public headers: Record<string, string | string[]> = {}) {}
}
export const ok = (body: unknown, headers?: Record<string, string | string[]>) => new Reply(200, body, headers);
export const created = (body: unknown, headers?: Record<string, string | string[]>) => new Reply(201, body, headers);

export interface Ctx {
  req: Req;
  id: string;
  ip: string | null;
  query: Record<string, string>;
  body: unknown;
}
export type Handler = (c: Ctx) => Promise<Reply>;

const header = (req: IncomingMessage, name: string): string | undefined => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

export function clientIp(req: IncomingMessage): string | null {
  const raw = header(req, 'x-vercel-forwarded-for') ?? header(req, 'x-real-ip') ?? header(req, 'x-forwarded-for')?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? '';
  const ip = raw.replace(/^::ffff:/, '');
  return isIP(ip) ? ip : null;
}

function normalizeQuery(req: Req): Record<string, string> {
  const out: Record<string, string> = {};
  const url = new URL(req.url ?? '/', 'http://localhost');
  url.searchParams.forEach((v, k) => { out[k] = v; });
  for (const [k, v] of Object.entries(req.query ?? {})) out[k] = Array.isArray(v) ? String(v[0]) : String(v);
  return out;
}

async function readBody(req: Req): Promise<unknown> {
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') return safeJson(req.body);
    return req.body;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 200_000) throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    chunks.push(c as Buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? safeJson(text) : undefined;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { throw badRequest('Request body must be valid JSON.'); }
}

function safeLogPath(req: Req): string {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  return pathname
    .replace(/(\/accounts\/)[^/]+/g, '$1:key')
    .replace(/(\/records\/)[^/]+/g, '$1:dataset');
}

/** Blocks cross-site writes: the browser Origin must match this host or ALLOWED_ORIGINS. */
function checkOrigin(req: Req): void {
  const cfg = config();
  const origin = header(req, 'origin');
  const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
  if (origin) {
    try {
      if (new URL(origin).host === host || cfg.allowedOrigins.includes(origin)) return;
    } catch { /* fall through */ }
    throw new AppError(403, 'BAD_ORIGIN', 'Cross-site request blocked.');
  }
  if (cfg.isProd && header(req, 'sec-fetch-site') !== 'same-origin') {
    throw new AppError(403, 'BAD_ORIGIN', 'Cross-site request blocked.');
  }
}

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) throw zodToApp(r.error);
  return r.data;
}

function zodToApp(e: ZodError): AppError {
  const issues = e.issues.map((i) => ({ field: i.path.join('.') || '(body)', message: i.message }));
  return new AppError(400, 'VALIDATION_ERROR', issues[0] ? `${issues[0].field}: ${issues[0].message}` : 'Invalid request.', issues);
}

export function route(handlers: Partial<Record<Method, Handler>>, opts: { cache?: string } = {}) {
  return async (req: Req, res: ServerResponse): Promise<void> => {
    const id = randomUUID();
    const send = (status: number, body: unknown, headers: Record<string, string | string[]> = {}) => {
      res.statusCode = status;
      res.setHeader('X-Request-Id', id);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', status === 200 && opts.cache ? opts.cache : 'no-store');
      for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
      if (status === 204 || body === undefined) { res.end(); return; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    try {
      const method = (req.method ?? 'GET').toUpperCase() as Method | 'OPTIONS';
      const origin = header(req, 'origin');
      const cors: Record<string, string> = {};
      if (origin && config().allowedOrigins.includes(origin)) {
        cors['Access-Control-Allow-Origin'] = origin;
        cors['Access-Control-Allow-Credentials'] = 'true';
        cors['Vary'] = 'Origin';
      }
      if (method === 'OPTIONS') return send(204, undefined, { ...cors, 'Access-Control-Allow-Methods': Object.keys(handlers).join(', '), 'Access-Control-Allow-Headers': 'Content-Type' });
      const h = handlers[method as Method];
      if (!h) return send(405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.', requestId: id } }, { Allow: Object.keys(handlers).join(', ') });
      if (method !== 'GET') checkOrigin(req);
      const body = method === 'GET' || method === 'DELETE' && !req.headers['content-length'] ? undefined : await readBody(req);
      const reply = await h({ req, id, ip: clientIp(req), query: normalizeQuery(req), body });
      const outcome = reply.body as { changed?: unknown } | null;
      if (method !== 'GET' && outcome && outcome.changed === 0) {
        console.warn(JSON.stringify({
          requestId: id,
          level: 'warn',
          event: 'write_no_rows_changed',
          method,
          path: safeLogPath(req),
        }));
      }
      send(reply.status, reply.body, { ...cors, ...reply.headers });
    } catch (e) {
      const app = e instanceof AppError ? e : e instanceof ZodError ? zodToApp(e) : fromDb(e);
      const method = (req.method ?? 'GET').toUpperCase();
      const databaseCode = (e as { code?: unknown } | null)?.code;
      console.error(JSON.stringify({
        requestId: id,
        level: 'error',
        event: method === 'GET' ? 'api_request_failed' : 'write_request_failed',
        method,
        path: safeLogPath(req),
        status: app?.status ?? 500,
        errorCode: app?.code ?? 'INTERNAL',
        ...(typeof databaseCode === 'string' && /^[0-9A-Z]{5}$/.test(databaseCode) ? { databaseCode } : {}),
      }));
      if (app) return send(app.status, { error: { code: app.code, message: app.message, details: app.details, requestId: id } });
      send(500, { error: { code: 'INTERNAL', message: 'Something went wrong on the server.', requestId: id } });
    }
  };
}

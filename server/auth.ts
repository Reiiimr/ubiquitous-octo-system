import type { IncomingMessage } from 'node:http';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config';
import { sql } from './db';
import { forbidden, unauthenticated } from './errors';

export const COOKIE = 'ekapon_session';
export type Scope = 'full' | 'reset';
export type AccountType = 'Admin' | 'Encoder' | 'Paravet' | 'User';

export interface Session {
  id: number;
  type: AccountType;
  scope: Scope;
  key: string | null;
  username: string | null;
  name: string;
}

const secret = () => new TextEncoder().encode(config().jwtSecret);
const RESET_SECONDS = 600;

export async function sessionCookie(account: { id: number; type: string }, scope: Scope): Promise<string> {
  const cfg = config();
  const ttl = scope === 'full' ? cfg.sessionHours * 3600 : RESET_SECONDS;
  const jwt = await new SignJWT({ typ: account.type, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(account.id))
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
  return `${COOKIE}=${jwt}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${cfg.isProd ? '; Secure' : ''}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config().isProd ? '; Secure' : ''}`;

function readCookie(req: IncomingMessage): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

/**
 * Verifies the session cookie AND re-checks the account in the database on every request,
 * so disabling, locking or archiving an account takes effect immediately.
 */
export async function requireAuth(req: IncomingMessage, opts: { roles?: AccountType[]; scope?: Scope } = {}): Promise<Session> {
  const token = readCookie(req);
  if (!token) throw unauthenticated();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] }));
  } catch {
    throw unauthenticated('Your session has expired. Please sign in again.');
  }
  const wantScope = opts.scope ?? 'full';
  if (payload.scope !== wantScope) throw unauthenticated(wantScope === 'full' ? 'Finish creating your new password first.' : 'Please sign in again.');
  const id = Number(payload.sub);
  const [a] = await sql()`
    select id, account_type::text as type, account_key, username::text as username, full_name, status::text as status
      from ekapon.accounts where id = ${id} and archived_at is null`;
  const expected = wantScope === 'full' ? 'Active' : 'Password reset required';
  if (!a || a.status !== expected) throw unauthenticated('Your session is no longer valid. Please sign in again.');
  if (opts.roles && !opts.roles.includes(a.type)) throw forbidden();
  return { id: a.id, type: a.type, scope: wantScope, key: a.account_key, username: a.username, name: a.full_name };
}

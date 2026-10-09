import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dispatchApi } from '../server/api-dispatch';

const paths = [
  '/api/v1/activity',
  '/api/v1/admin/controls',
  '/api/v1/admin/backup',
  '/api/v1/health',
  '/api/v1/accounts/archive',
  '/api/v1/accounts',
  '/api/v1/accounts/ENC-001',
  '/api/v1/accounts/ENC-001/reset-password',
  '/api/v1/auth/first-signin',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/auth/set-password',
  '/api/v1/barangays',
  '/api/v1/census/submissions',
  '/api/v1/census/submissions/00000000-0000-4000-8000-000000000000',
  '/api/v1/prelistings',
  '/api/v1/records/owners',
  '/api/v1/records/owners/archive',
  '/api/v1/records/owners/import',
  '/api/v1/records/owners/undo-import',
];

describe('API dispatcher', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'dispatcher-test-secret-that-is-at-least-32-characters';
    process.env.NODE_ENV = 'development';
    server = createServer((req, res) => { void dispatchApi(req, res); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('dispatches every existing API route', async () => {
    for (const path of paths) {
      const response = await fetch(`${baseUrl}${path}`, { method: 'OPTIONS' });
      expect(response.status, path).toBe(204);
    }
  });

  it('returns 404 for an unknown API route', async () => {
    const response = await fetch(`${baseUrl}/api/v1/not-a-route`, { method: 'OPTIONS' });
    expect(response.status).toBe(404);
  });

  it('dispatches explicit Vercel rewrites through the single API function', async () => {
    const response = await fetch(`${baseUrl}/api?route=${encodeURIComponent('/api/v1/health')}&page=2`, {
      method: 'OPTIONS',
    });
    expect(response.status).toBe(204);
  });
});

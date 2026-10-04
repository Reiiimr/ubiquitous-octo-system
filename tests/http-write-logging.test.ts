import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { route, ok } from '../server/http';

describe('API mutation logging', () => {
  let server: Server;
  let baseUrl: string;
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warningLog = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    process.env.JWT_SECRET = 'mutation-log-test-secret-at-least-32-characters';
    process.env.NODE_ENV = 'development';
    const handler = route({
      POST: async (context) => {
        if ((context.body as { fail?: boolean } | undefined)?.fail) throw Object.assign(new Error('Database error'), { code: '42501' });
        return ok({ changed: 0 });
      },
    });
    server = createServer((req, res) => { void handler(req, res); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    errorLog.mockRestore();
    warningLog.mockRestore();
  });

  it('logs failed writes with a request id and database code without the route identifier', async () => {
    const response = await fetch(`${baseUrl}/api/v1/accounts/SECRET-ACCOUNT-KEY`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fail: true, password: 'must-not-be-logged' }),
    });
    const event = JSON.parse(String(errorLog.mock.calls.at(-1)?.[0]));
    expect(response.status).toBe(403);
    expect(event).toMatchObject({
      event: 'write_request_failed',
      method: 'POST',
      path: '/api/v1/accounts/:key',
      databaseCode: '42501',
    });
    expect(event.requestId).toBeTruthy();
    expect(JSON.stringify(event)).not.toContain('SECRET-ACCOUNT-KEY');
    expect(JSON.stringify(event)).not.toContain('must-not-be-logged');
  });

  it('warns when a write response reports no changed rows', async () => {
    const response = await fetch(`${baseUrl}/api/v1/records/owners/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const event = JSON.parse(String(warningLog.mock.calls.at(-1)?.[0]));
    expect(response.status).toBe(200);
    expect(event).toMatchObject({
      event: 'write_no_rows_changed',
      method: 'POST',
      path: '/api/v1/records/:dataset/archive',
    });
    expect(event.requestId).toBeTruthy();
  });
});

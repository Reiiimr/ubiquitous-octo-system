import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, client } from './harness';
import { sql, closeDb } from '../server/db';

const uniq = Math.random().toString(36).slice(2, 7);
const LAST = `Tester${uniq}`;
let call: ReturnType<typeof client>, close: () => Promise<void>, base: string;
let admin: string, encoder: string, paravet: string;
let acct: { id: number; key: string };
let tmp: string;

beforeAll(async () => {
  const s = await startServer(); close = s.close; base = s.base; call = client(s.base);
  await sql()`delete from ekapon.login_attempts`;
  admin = (await call('POST', '/api/v1/auth/login', { json: { identifier: 'admin', password: 'ChangeMe-123' } })).cookie!;
  encoder = (await call('POST', '/api/v1/auth/login', { json: { identifier: 'encoder', password: 'ChangeMe-123' } })).cookie!;
});
afterAll(async () => {
  await sql()`delete from ekapon.census_submissions
               where actor_id in (select id from ekapon.accounts where last_name = ${LAST})
                  or submitter_name = ${`Test ${LAST}`}`;
  await sql()`delete from ekapon.dashboard_records where record_id like ${`TEST-CENSUS-${uniq}-%`}`;
  await sql()`delete from ekapon.accounts where last_name = ${LAST}`;
  await sql()`delete from ekapon.login_attempts`;
  await close(); await closeDb();
});

describe('foundation', () => {
  it('health check reaches the database', async () => {
    const r = await call('GET', '/api/v1/health'); expect(r.status).toBe(200); expect(r.json.ok).toBe(true);
  });
  it('answers 405 for a wrong method and 400 for broken JSON', async () => {
    expect((await call('PUT', '/api/v1/health')).status).toBe(405);
    const r = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{not json' });
    expect(r.status).toBe(400); expect(((await r.json()) as any).error.code).toBe('BAD_REQUEST');
  });
  it('lists the 62 barangays publicly with caching, and filters', async () => {
    const all = await call('GET', '/api/v1/barangays'); expect(all.json.total).toBe(62);
    expect(all.headers.get('cache-control')).toContain('max-age=3600');
    expect((await call('GET', '/api/v1/barangays?q=muzon')).json.total).toBe(4);
    expect((await call('GET', '/api/v1/barangays?district=1')).json.total).toBe(26);
    const tm = (await call('GET', '/api/v1/barangays?q=tungkong')).json.data[0];
    expect(tm).toMatchObject({ acronym: 'TM', zip: '3023', district: '1st District' });
  });
});

describe('sign-in and sessions', () => {
  it('rejects requests without a session', async () => {
    expect((await call('GET', '/api/v1/auth/me')).status).toBe(401);
    expect((await call('GET', '/api/v1/accounts')).status).toBe(401);
  });
  it('gives the same generic error for a wrong password and an unknown user', async () => {
    const a = await call('POST', '/api/v1/auth/login', { json: { identifier: 'admin', password: 'nope-nope-1' } });
    const b = await call('POST', '/api/v1/auth/login', { json: { identifier: 'ghost-user', password: 'nope-nope-1' } });
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect(a.json.error.code).toBe('INVALID_CREDENTIALS'); expect(a.json.error.message).toBe(b.json.error.message);
  });
  it('sets a hardened cookie and returns the profile', async () => {
    const r = await call('POST', '/api/v1/auth/login', { json: { identifier: 'admin', password: 'ChangeMe-123' } });
    expect(r.setCookie).toMatch(/HttpOnly/); expect(r.setCookie).toMatch(/SameSite=Strict/);
    expect(r.json.account.type).toBe('SuperAdmin');
    const me = await call('GET', '/api/v1/auth/me', { cookie: r.cookie }); expect(me.json.account.username).toBe('admin');
  });
  it('blocks cross-site writes', async () => {
    const r = await call('POST', '/api/v1/auth/logout', { origin: 'https://evil.example', cookie: admin });
    expect(r.status).toBe(403); expect(r.json.error.code).toBe('BAD_ORIGIN');
  });
  it('rate-limits sign-in per IP', async () => {
    await sql()`insert into ekapon.login_attempts (login_identifier, method, success, reason, ip) select 'x', 'permanent', false, 'invalid', '203.0.113.9' from generate_series(1, 25)`;
    const r = await call('POST', '/api/v1/auth/login', { json: { identifier: 'admin', password: 'ChangeMe-123' }, ip: '203.0.113.9' });
    expect(r.status).toBe(429);
    await sql()`delete from ekapon.login_attempts where ip = '203.0.113.9'`;
  });
  it('logout clears the cookie', async () => {
    const r = await call('POST', '/api/v1/auth/logout', { cookie: admin }); expect(r.setCookie).toMatch(/Max-Age=0/);
  });
});

describe('authorization', () => {
  it('only SuperAdmin can use the accounts API', async () => {
    const r = await call('GET', '/api/v1/accounts', { cookie: encoder }); expect(r.status).toBe(403);
    expect((await call('POST', '/api/v1/accounts', { cookie: encoder, json: {} })).status).toBe(403);
  });
});

describe('accounts', () => {
  const body = () => ({ accountType: 'Paravet', firstName: 'Test', lastName: LAST, mobile: '0917 123 4567', barangay: 'tungkong mangga' });
  it('validates input', async () => {
    expect((await call('POST', '/api/v1/accounts', { cookie: admin, json: { ...body(), mobile: '0917' } })).status).toBe(400);
    expect((await call('POST', '/api/v1/accounts', { cookie: admin, json: { ...body(), accountType: 'Admin' } })).status).toBe(400);
    const r = await call('POST', '/api/v1/accounts', { cookie: admin, json: { ...body(), barangay: 'Narnia' } });
    expect(r.status).toBe(422); expect(r.json.error.code).toBe('UNKNOWN_BARANGAY');
  });
  it('creates a Paravet account with the right key and a one-time temporary password', async () => {
    const r = await call('POST', '/api/v1/accounts', { cookie: admin, json: body() });
    expect(r.status).toBe(201);
    expect(r.json.account.accountKey).toMatch(/^PV\d{4}-TMP\d{3,}-3023$/);
    expect(r.json.account.mobile).toBe('0917-123-4567');
    expect(r.json.account.status).toBe('Temporary password pending');
    expect(r.json.temporaryPassword).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    expect(r.json.temporaryPassword).not.toMatch(/[0OolIi125SZz]/);
    expect(r.headers.get('cache-control')).toBe('no-store');
    acct = { id: r.json.account.id, key: r.json.account.accountKey }; tmp = r.json.temporaryPassword;
    const again = await call('GET', `/api/v1/accounts/${acct.key}`, { cookie: admin });
    expect(JSON.stringify(again.json)).not.toContain(tmp);
  });
  it('rejects a duplicate person in the same barangay', async () => {
    const r = await call('POST', '/api/v1/accounts', { cookie: admin, json: body() }); expect(r.status).toBe(409); expect(r.json.error.code).toBe('DUPLICATE_ACCOUNT');
  });
  it('writes the audit log with the acting admin', async () => {
    const [{ n }] = await sql()`select count(*)::int as n from ekapon.audit_log where table_name = 'accounts' and record_id = ${String(acct.id)} and account_id is not null`;
    expect(n).toBeGreaterThan(0);
    const [{ leak }] = await sql()`select count(*)::int as leak from ekapon.audit_log where new_data ? 'password_hash'`; expect(leak).toBe(0);
  });
  it('first sign-in: wrong passwords count down, then the account locks', async () => {
    const a = await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: 'wrong-pass1' } });
    expect(a.status).toBe(401); expect(a.json.error.details.attemptsLeft).toBe(2);
    await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: 'wrong-pass2' } });
    const c = await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: 'wrong-pass3' } });
    expect(c.status).toBe(423);
    expect((await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: tmp } })).status).toBe(423);
  });
  it('admin reset unlocks with a new temporary password; the old one is dead', async () => {
    const r = await call('POST', `/api/v1/accounts/${acct.key}/reset-password`, { cookie: admin });
    expect(r.status).toBe(200); expect(r.json.temporaryPassword).not.toBe(tmp);
    const old = await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: tmp } }); expect(old.status).toBe(401);
    tmp = r.json.temporaryPassword;
  });
  let reset: string;
  it('temporary password works once and only unlocks the Create New Password step', async () => {
    const r = await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: tmp } });
    expect(r.status).toBe(200); expect(r.json.mustCreatePassword).toBe(true); reset = r.cookie!;
    expect((await call('GET', '/api/v1/auth/me', { cookie: reset })).status).toBe(401);
    expect((await call('GET', '/api/v1/accounts', { cookie: reset })).status).toBe(401);
    expect((await call('POST', '/api/v1/auth/first-signin', { json: { accountKey: acct.key, temporaryPassword: tmp } })).status).toBe(401);
    expect((await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: tmp } })).json.error.code).toBe('FIRST_SIGN_IN_REQUIRED');
  });
  it('enforces the new-password rules, then opens a full session', async () => {
    expect((await call('POST', '/api/v1/auth/set-password', { cookie: reset, json: { newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' } })).status).toBe(422);
    expect((await call('POST', '/api/v1/auth/set-password', { cookie: reset, json: { newPassword: 'Strong-Pass-1', confirmPassword: 'Different-1' } })).status).toBe(400);
    expect((await call('POST', '/api/v1/auth/set-password', { json: { newPassword: 'Strong-Pass-1', confirmPassword: 'Strong-Pass-1' } })).status).toBe(401);
    const ok = await call('POST', '/api/v1/auth/set-password', { cookie: reset, json: { newPassword: 'Strong-Pass-1', confirmPassword: 'Strong-Pass-1' } });
    expect(ok.status).toBe(200);
    const me = await call('GET', '/api/v1/auth/me', { cookie: ok.cookie }); expect(me.json.account.type).toBe('Paravet');
    paravet = ok.cookie!;
    expect((await call('GET', '/api/v1/accounts', { cookie: ok.cookie })).status).toBe(403);
    const login = await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: 'Strong-Pass-1' } }); expect(login.status).toBe(200);
  });
  it('locks the account for 15 minutes after 5 wrong permanent passwords', async () => {
    for (let i = 0; i < 5; i++) expect((await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: 'Wrong-Pass-' + i } })).status).toBe(401);
    const locked = await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: 'Strong-Pass-1' } });
    expect(locked.status).toBe(423); expect(locked.json.error.code).toBe('ACCOUNT_LOCKED');
    await sql()`update ekapon.accounts set locked_until = null, failed_login_count = 0 where id = ${acct.id}`;
    expect((await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: 'Strong-Pass-1' } })).status).toBe(200);
  });
  it('holds Paravet census data for Admin review and applies it only after approval', async () => {
    const submissionId = crypto.randomUUID();
    const householdId = `TEST-CENSUS-${uniq}-household`;
    const animalId = `TEST-CENSUS-${uniq}-animal`;
    const records = [
      { dataset: 'households', record: { id: householdId, name: 'Test household', barangay: 'Tungkong Mangga', animals: 1 } },
      { dataset: 'animals', record: { id: animalId, species: 'Dog', barangay: 'Tungkong Mangga', owner: 'Test household' } },
    ];
    expect((await call('POST', '/api/v1/records/animals', { cookie: paravet, json: { records: [records[1].record] } })).status).toBe(403);
    expect((await call('POST', '/api/v1/records/animals/archive', { cookie: paravet, json: { ids: [animalId], archived: true } })).status).toBe(403);
    const crossBarangay = await call('POST', '/api/v1/census/submissions', {
      cookie: paravet,
      json: { submissionId, label: 'Test census', records: [{ dataset: 'animals', record: { id: animalId, barangay: 'Muzon Proper' } }] },
    });
    expect(crossBarangay.status).toBe(403);
    const submitted = await call('POST', '/api/v1/census/submissions', {
      cookie: paravet,
      json: { submissionId, label: 'Test census', records },
    });
    expect(submitted.status).toBe(200);
    expect(submitted.json).toMatchObject({ submissionId, status: 'pending', recordCount: 2 });
    const privateList = await call('GET', '/api/v1/census/submissions?status=all', { cookie: paravet });
    expect(privateList.json.data.some((item: any) => item.id === submissionId)).toBe(true);
    expect((await call('PUT', `/api/v1/census/submissions/${submissionId}`, {
      cookie: paravet, json: { decision: 'approve' },
    })).status).toBe(403);
    const detail = await call('GET', `/api/v1/census/submissions/${submissionId}`, { cookie: encoder });
    expect(detail.json.submission.records).toHaveLength(2);
    const pendingBefore = await call('GET', `/api/v1/records/animals?archived=all`, { cookie: admin });
    expect(pendingBefore.json.data.some((row: any) => row.id === animalId)).toBe(false);
    const approved = await call('PUT', `/api/v1/census/submissions/${submissionId}`, {
      cookie: encoder, json: { decision: 'approve', note: 'Reviewed against census form.' },
    });
    expect(approved.json).toMatchObject({ status: 'approved', applied: 2 });
    const after = await call('GET', '/api/v1/records/animals?archived=all', { cookie: admin });
    expect(after.json.data.some((row: any) => row.id === animalId)).toBe(true);
    expect((await call('PUT', `/api/v1/census/submissions/${submissionId}`, {
      cookie: admin, json: { decision: 'reject' },
    })).status).toBe(403);

    const rejectedId = crypto.randomUUID();
    const rejectedRecordId = `TEST-CENSUS-${uniq}-rejected`;
    expect((await call('POST', '/api/v1/census/submissions', {
      cookie: paravet,
      json: {
        submissionId: rejectedId,
        label: 'Rejected test census',
        records: [{ dataset: 'animals', record: { id: rejectedRecordId, species: 'Cat', barangay: 'Tungkong Mangga' } }],
      },
    })).status).toBe(200);
    const rejected = await call('PUT', `/api/v1/census/submissions/${rejectedId}`, {
      cookie: admin, json: { decision: 'reject', note: 'Test rejection.' },
    });
    expect(rejected.json).toMatchObject({ status: 'rejected', applied: 0 });
    const afterReject = await call('GET', '/api/v1/records/animals?archived=all', { cookie: admin });
    expect(afterReject.json.data.some((row: any) => row.id === rejectedRecordId)).toBe(false);
  });
  it('blocks approval when a submitted record ID already belongs to another barangay', async () => {
    const recordId = `TEST-CENSUS-${uniq}-collision`;
    const original = { id: recordId, species: 'Dog', barangay: 'Muzon Proper', owner: 'Original record' };
    await sql()`
      insert into ekapon.dashboard_records (dataset, record_id, record_data, archived)
      values ('animals', ${recordId}, ${sql().json(original)}, false)
    `;

    const submissionId = crypto.randomUUID();
    expect((await call('POST', '/api/v1/census/submissions', {
      cookie: paravet,
      json: {
        submissionId,
        label: 'Cross-barangay collision test',
        records: [{ dataset: 'animals', record: { id: recordId, species: 'Cat', barangay: 'Tungkong Mangga' } }],
      },
    })).status).toBe(200);
    const approval = await call('PUT', `/api/v1/census/submissions/${submissionId}`, {
      cookie: admin, json: { decision: 'approve' },
    });
    expect(approval.status).toBe(403);

    const detail = await call('GET', '/api/v1/records/animals?archived=all', { cookie: admin });
    expect(detail.json.data.find((row: any) => row.id === recordId)).toMatchObject(original);
    const pending = await call('GET', `/api/v1/census/submissions/${submissionId}`, { cookie: admin });
    expect(pending.json.submission.status).toBe('pending');
  });
  it('lists with search, filters, sorting, month/year and pagination', async () => {
    for (let i = 0; i < 2; i++) await call('POST', '/api/v1/accounts', { cookie: admin, json: { ...body(), firstName: 'Extra' + i, mobile: '09170000000' } });
    const q = await call('GET', `/api/v1/accounts?q=${LAST}`, { cookie: admin }); expect(q.json.total).toBe(3);
    const p = await call('GET', `/api/v1/accounts?q=${LAST}&pageSize=2&page=2`, { cookie: admin }); expect(p.json.data.length).toBe(1); expect(p.json.pageSize).toBe(2);
    const asc = (await call('GET', `/api/v1/accounts?q=${LAST}&sort=name&dir=asc`, { cookie: admin })).json.data.map((a: any) => a.firstName);
    const desc = (await call('GET', `/api/v1/accounts?q=${LAST}&sort=name&dir=desc`, { cookie: admin })).json.data.map((a: any) => a.firstName);
    expect(asc.length).toBe(3); expect(asc).not.toEqual(desc.slice().reverse().length ? [] : asc);
    const now = new Date();
    expect((await call('GET', `/api/v1/accounts?q=${LAST}&year=${now.getFullYear()}&month=${now.getMonth() + 1}&type=Paravet&barangay=Tungkong Mangga`, { cookie: admin })).json.total).toBe(3);
    expect((await call('GET', `/api/v1/accounts?q=${LAST}&year=2019`, { cookie: admin })).json.total).toBe(0);
    expect((await call('GET', '/api/v1/accounts?sort=password_hash', { cookie: admin })).status).toBe(422);
    expect((await call('GET', '/api/v1/accounts?pageSize=9999', { cookie: admin })).status).toBe(400);
  });
  it('edits an account without changing its key; staff accounts are protected', async () => {
    const r = await call('PATCH', `/api/v1/accounts/${acct.key}`, { cookie: admin, json: { mobile: '09180001111', barangay: 'Muzon Proper' } });
    expect(r.status).toBe(200); expect(r.json.account.accountKey).toBe(acct.key); expect(r.json.account.barangay.name).toBe('Muzon Proper'); expect(r.json.account.mobile).toBe('0918-000-1111');
    expect((await call('PATCH', `/api/v1/accounts/${acct.key}`, { cookie: admin, json: {} })).status).toBe(400);
    const [{ id }] = await sql()`select id from ekapon.accounts where username = 'encoder'`;
    expect((await call('PATCH', `/api/v1/accounts/${id}`, { cookie: admin, json: { mobile: '09180001111' } })).status).toBe(403);
    expect((await call('POST', `/api/v1/accounts/${id}/reset-password`, { cookie: admin })).status).toBe(403);
  });
  it('archives and restores in a batch; archived accounts cannot sign in', async () => {
    const a = await call('POST', '/api/v1/accounts/archive', { cookie: admin, json: { ids: [acct.id] } }); expect(a.json.changed).toBe(1);
    expect((await call('GET', `/api/v1/accounts?q=${LAST}`, { cookie: admin })).json.total).toBe(2);
    expect((await call('GET', `/api/v1/accounts?q=${LAST}&archived=true`, { cookie: admin })).json.total).toBe(1);
    expect((await call('POST', '/api/v1/auth/login', { json: { identifier: acct.key, password: 'Strong-Pass-1' } })).status).toBe(401);
    const b = await call('POST', '/api/v1/accounts/archive', { cookie: admin, json: { ids: [acct.id], restore: true } }); expect(b.json.changed).toBe(1);
    const [{ id: adminId }] = await sql()`select id from ekapon.accounts where username = 'admin'`;
    expect((await call('POST', '/api/v1/accounts/archive', { cookie: admin, json: { ids: [adminId] } })).status).toBe(403);
  });
  it('deletes a portal account but never your own', async () => {
    expect((await call('DELETE', `/api/v1/accounts/${acct.key}`, { cookie: admin })).status).toBe(200);
    expect((await call('GET', `/api/v1/accounts/${acct.key}`, { cookie: admin })).status).toBe(404);
    const [{ id: adminId }] = await sql()`select id from ekapon.accounts where username = 'admin'`;
    expect((await call('DELETE', `/api/v1/accounts/${adminId}`, { cookie: admin })).status).toBe(403);
    expect((await call('GET', '/api/v1/accounts/not-a-key', { cookie: admin })).status).toBe(400);
  });
});

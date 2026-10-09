import { z } from 'zod';
import { route, ok, created, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { listQuery, likePattern } from '../../../server/listing';
import { ACCOUNT_BASE, toAccount, findAccount, type AccountRow } from '../../../server/accountsView';
import { createAccount } from '../../../server/accountSchemas';
import { conflict, unprocessable } from '../../../server/errors';

const SORTS: Record<string, string> = { name: 'last_name', key: 'account_key', type: 'account_type', barangay: 'barangay', status: 'status', created: 'created_at' };
const query = listQuery.extend({
  type: z.enum(['SuperAdmin', 'Admin', 'Paravet', 'User']).optional(),
  barangay: z.string().trim().max(60).optional(),
  status: z.string().trim().max(40).optional(),
});

export default route({
  GET: async (c) => {
    await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const f = parse(query, c.query);
    if (f.sort && !SORTS[f.sort]) throw unprocessable('INVALID_SORT', `sort must be one of: ${Object.keys(SORTS).join(', ')}`);
    const where: string[] = ['x.archived = $1'];
    const args: unknown[] = [f.archived];
    const add = (cond: string, ...vals: unknown[]) => { let i = args.length; where.push(cond.replace(/\?/g, () => `$${++i}`)); args.push(...vals); };
    if (f.type) add('x.account_type = ?', f.type);
    if (f.barangay) add('lower(x.barangay) = lower(?)', f.barangay);
    if (f.status) add('x.status = ?', f.status);
    if (f.year) add(`extract(year from x.created_at at time zone 'Asia/Manila') = ?`, f.year);
    if (f.month) add(`extract(month from x.created_at at time zone 'Asia/Manila') = ?`, f.month);
    if (f.q) add(`(x.full_name ilike ? or x.account_key ilike ? or x.mobile ilike ? or x.username ilike ?)`, likePattern(f.q), likePattern(f.q), likePattern(f.q), likePattern(f.q));
    const order = `${SORTS[f.sort ?? 'created'] ?? 'created_at'} ${f.dir === 'asc' ? 'asc' : 'desc'}, x.id`;
    const base = `from (${ACCOUNT_BASE}) x where ${where.join(' and ')}`;
    const [{ total }] = await sql().unsafe(`select count(*)::int as total ${base}`, args as never[]);
    const rows = await sql().unsafe(`select x.* ${base} order by x.${order} limit ${f.pageSize} offset ${(f.page - 1) * f.pageSize}`, args as never[]);
    return ok({ data: (rows as unknown as AccountRow[]).map(toAccount), page: f.page, pageSize: f.pageSize, total });
  },

  POST: async (c) => {
    const s = await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const b = parse(createAccount, c.body);
    const [{ id: barangayId }] = await sql()`select ekapon.find_barangay(${b.barangay}) as id`;
    if (!barangayId) throw unprocessable('UNKNOWN_BARANGAY', 'Choose one of the 62 official barangays.', { field: 'barangay' });
    const result = await tx(s.id, async (q) => {
      const dup = await q`select 1 from ekapon.accounts where account_type = ${b.accountType}::ekapon.account_type and barangay_id = ${barangayId}
                             and lower(btrim(first_name)) = lower(${b.firstName}) and lower(btrim(last_name)) = lower(${b.lastName}) and archived_at is null`;
      if (dup.length) throw conflict('DUPLICATE_ACCOUNT', 'An account for this person already exists in this barangay.');
      const [a] = await q`
        insert into ekapon.accounts (account_type, first_name, middle_name, last_name, suffix, mobile, barangay_id, paravet_id, owner_id)
        values (${b.accountType}::ekapon.account_type, ${b.firstName}, ${b.middleName ?? null}, ${b.lastName}, ${b.suffix ?? null}, ${b.mobile},
                ${barangayId}, ${b.paravetId ?? null}, ${b.ownerId ?? null})
        returning id`;
      const [{ pw }] = await q`select ekapon.issue_temp_password(${a.id}::bigint) as pw`;
      return { id: a.id as number, pw: pw as string };
    });
    const account = await findAccount(String(result.id));
    return created({ account: toAccount(account!), temporaryPassword: result.pw, expiresInMinutes: 15, notice: 'Shown once. Give it to the user now; it expires in 15 minutes.' });
  },
});

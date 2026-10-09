import { z } from 'zod';
import { route, ok, parse } from '../../server/http';
import { sql, tx } from '../../server/db';
import { requireAuth } from '../../server/auth';
import { listQuery } from '../../server/listing';

const query = listQuery.pick({ page: true, pageSize: true });
const bodySchema = z.object({
  action: z.string().trim().min(1).max(100),
  detail: z.string().trim().max(1000).default(''),
});

export default route({
  GET: async (c) => {
    await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin'] });
    const { page, pageSize } = parse(query, c.query);
    const [{ total }] = await sql()`
      select count(*)::int as total from ekapon.audit_log where table_name = 'activity'`;
    const rows = await sql()`
      select l.id, l.created_at, coalesce(a.username::text, a.full_name, 'System') as username,
             l.new_data->>'action' as action, l.record_id as detail
        from ekapon.audit_log l
        left join ekapon.accounts a on a.id = l.account_id
       where l.table_name = 'activity'
       order by l.created_at desc, l.id desc
       limit ${pageSize} offset ${(page - 1) * pageSize}`;
    return ok({
      data: rows.map((row) => ({
        id: String(row.id),
        time: new Date(row.created_at).toISOString().slice(0, 19).replace('T', ' '),
        user: row.username,
        action: row.action,
        detail: row.detail ?? '',
      })),
      page, pageSize, total,
    });
  },

  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin'] });
    const { action, detail } = parse(bodySchema, c.body);
    await tx(session.id, (q) => q`select ekapon.log_activity(${action}, ${detail})`);
    return ok({ logged: true });
  },
});

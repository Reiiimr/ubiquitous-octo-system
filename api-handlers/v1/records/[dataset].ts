import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { dataset, recordBatch } from '../../../server/dashboard';
import { listQuery } from '../../../server/listing';
import { forbidden, unprocessable } from '../../../server/errors';

const query = listQuery.pick({ page: true, pageSize: true }).extend({
  archived: z.enum(['true', 'false', 'all']).default('false'),
});
const PARAVET_READ_DATASETS = new Set(['owners', 'pets', 'respondents', 'households', 'animals']);

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'] });
    const kind = dataset(c.query.dataset);
    if (session.type === 'Paravet' && !PARAVET_READ_DATASETS.has(kind)) throw forbidden('This dataset is not available to Paravets.');
    const f = parse(query, c.query);
    const all = f.archived === 'all';
    const showArchived = f.archived === 'true';
    const [{ total }] = await sql()`
      select count(*)::int as total from ekapon.dashboard_records
       where dataset = ${kind} and (${all} or archived = ${showArchived})
         and (${session.type !== 'Paravet'} or lower(record_data->>'barangay') = lower(${session.barangay ?? ''}))`;
    const rows = await sql()`
      select record_data, archived
        from ekapon.dashboard_records
       where dataset = ${kind} and (${all} or archived = ${showArchived})
         and (${session.type !== 'Paravet'} or lower(record_data->>'barangay') = lower(${session.barangay ?? ''}))
       order by updated_at desc, record_id
       limit ${f.pageSize} offset ${(f.page - 1) * f.pageSize}`;
    return ok({
      data: rows.map((row) => ({ ...row.record_data, _archived: row.archived })),
      page: f.page,
      pageSize: f.pageSize,
      total,
    });
  },

  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin'] });
    const kind = dataset(c.query.dataset);
    const { records } = parse(recordBatch, c.body);
    for (const row of records) {
      if (Buffer.byteLength(JSON.stringify(row), 'utf8') > 20_000) {
        throw unprocessable('RECORD_TOO_LARGE', 'Each record must be 20 KB or smaller.');
      }
    }
    await tx(session.id, async (q) => {
      for (const row of records) {
        const id = String(row.id);
        const saved = await q`
          insert into ekapon.dashboard_records as current_record (dataset, record_id, record_data, archived)
          values (${kind}, ${id}, ${JSON.stringify(row)}::jsonb, false)
          on conflict (dataset, record_id) do update
             set record_data = excluded.record_data, archived = false, updated_at = now()
          returning record_id`;
        if (!saved.length) throw forbidden('The record could not be saved.');
      }
    });
    return ok({ saved: records.length });
  },
});

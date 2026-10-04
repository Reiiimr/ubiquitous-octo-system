import { z } from 'zod';
import { route, ok, parse } from '../../../../server/http';
import { tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import { dataset, recordBatch } from '../../../../server/dashboard';
import { conflict, forbidden, unprocessable } from '../../../../server/errors';

const bodySchema = recordBatch.extend({
  batchId: z.string().uuid(),
  label: z.string().trim().min(1).max(160),
});

export default route({
  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['Admin', 'Encoder'] });
    const kind = dataset(c.query.dataset);
    const body = parse(bodySchema, c.body);
    await tx(session.id, async (q) => {
      await q`
        insert into ekapon.dashboard_import_batches (batch_id, dataset, actor_id, label)
        values (${body.batchId}::uuid, ${kind}, ${session.id}, ${body.label})
        on conflict (batch_id) do nothing`;
      const [batch] = await q`
        select dataset, actor_id, undone_at
          from ekapon.dashboard_import_batches
         where batch_id = ${body.batchId}::uuid
         for update`;
      if (!batch || Number(batch.actor_id) !== session.id) throw forbidden('This import batch belongs to another account.');
      if (batch.dataset !== kind || batch.undone_at) throw conflict('IMPORT_BATCH_CLOSED', 'This import batch cannot accept more records.');

      for (const record of body.records) {
        if (Buffer.byteLength(JSON.stringify(record), 'utf8') > 20_000) throw unprocessable('RECORD_TOO_LARGE', 'Each record must be 20 KB or smaller.');
        const id = String(record.id);
        const [before] = await q`
          select record_data, archived from ekapon.dashboard_records
           where dataset = ${kind} and record_id = ${id}
           for update`;
        await q`
          insert into ekapon.dashboard_import_items
            (batch_id, record_id, existed_before, before_data, before_archived, after_data)
          values (${body.batchId}::uuid, ${id}, ${Boolean(before)}, ${before?.record_data ?? null},
                  ${before?.archived ?? null}, ${JSON.stringify(record)}::jsonb)
          on conflict (batch_id, record_id) do update set after_data = excluded.after_data`;
        await q`
          insert into ekapon.dashboard_records (dataset, record_id, record_data, archived)
          values (${kind}, ${id}, ${JSON.stringify(record)}::jsonb, false)
          on conflict (dataset, record_id) do update
             set record_data = excluded.record_data, archived = false, updated_at = now()`;
      }
    });
    return ok({ saved: body.records.length, batchId: body.batchId });
  },
});

import { z } from 'zod';
import { route, ok, parse } from '../../../../server/http';
import { tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import { dataset, recordBatch } from '../../../../server/dashboard';
import { conflict, forbidden, unprocessable } from '../../../../server/errors';
import { appendCensusSubmission, type CensusRecord } from '../../../../server/censusSubmissions';

const bodySchema = recordBatch.extend({
  batchId: z.string().uuid(),
  label: z.string().trim().min(1).max(160),
});
const PARAVET_DATASETS = new Set(['respondents', 'households', 'animals']);

export default route({
  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'] });
    const kind = dataset(c.query.dataset);
    if (session.type === 'Paravet' && !PARAVET_DATASETS.has(kind)) throw forbidden('This dataset is not available to Paravets.');
    const body = parse(bodySchema, c.body);
    if (session.type === 'Paravet') {
      const barangayId = session.barangayId;
      if (!barangayId) throw forbidden('Your account must be assigned to a barangay before importing records.');
      const count = await tx(session.id, async (q) => appendCensusSubmission(q, {
        submissionId: body.batchId,
        actorId: session.id,
        submitterName: session.name,
        barangayId,
        label: body.label,
        records: body.records.map((record) => ({ dataset: kind as CensusRecord['dataset'], record })) as CensusRecord[],
      }));
      return ok({ submitted: body.records.length, recordCount: count, status: 'pending', submissionId: body.batchId });
    }
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
        const saved = await q`
          insert into ekapon.dashboard_records as current_record (dataset, record_id, record_data, archived)
          values (${kind}, ${id}, ${JSON.stringify(record)}::jsonb, false)
          on conflict (dataset, record_id) do update
             set record_data = excluded.record_data, archived = false, updated_at = now()
          returning record_id`;
        if (!saved.length) throw forbidden('The record could not be saved.');
      }
    });
    return ok({ saved: body.records.length, batchId: body.batchId });
  },
});

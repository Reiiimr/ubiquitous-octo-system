import { z } from 'zod';
import { route, ok, parse } from '../../../../server/http';
import { tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import { dataset } from '../../../../server/dashboard';
import { conflict, forbidden, notFound } from '../../../../server/errors';

const bodySchema = z.object({ batchId: z.string().uuid() });

export default route({
  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['Admin', 'Encoder'] });
    const kind = dataset(c.query.dataset);
    const { batchId } = parse(bodySchema, c.body);
    await tx(session.id, async (q) => {
      const [batch] = await q`
        select dataset, actor_id, undone_at
          from ekapon.dashboard_import_batches
         where batch_id = ${batchId}::uuid
         for update`;
      if (!batch) throw notFound('Import batch not found.');
      if (Number(batch.actor_id) !== session.id) throw forbidden('You can only undo your own import.');
      if (batch.dataset !== kind) throw conflict('IMPORT_DATASET_MISMATCH', 'This import belongs to another dataset.');
      if (batch.undone_at) throw conflict('IMPORT_ALREADY_UNDONE', 'This import has already been undone.');
      const items = await q`
        select record_id, existed_before, before_data, before_archived, after_data
          from ekapon.dashboard_import_items
         where batch_id = ${batchId}::uuid
         order by record_id
         for update`;
      for (const item of items) {
        const [current] = await q`
          select record_data = ${JSON.stringify(item.after_data)}::jsonb as matches, archived from ekapon.dashboard_records
           where dataset = ${kind} and record_id = ${item.record_id}
           for update`;
        if (!current || current.archived || !current.matches) {
          throw conflict('IMPORT_RECORD_CHANGED', 'An imported record changed after this import. Refresh the data and resolve the changes before undoing it.');
        }
      }
      for (const item of items) {
        if (item.existed_before) {
          await q`
            update ekapon.dashboard_records
               set record_data = ${JSON.stringify(item.before_data)}::jsonb,
                   archived = ${item.before_archived}, updated_at = now()
             where dataset = ${kind} and record_id = ${item.record_id}`;
        } else {
          await q`delete from ekapon.dashboard_records where dataset = ${kind} and record_id = ${item.record_id}`;
        }
      }
      await q`update ekapon.dashboard_import_batches set undone_at = now() where batch_id = ${batchId}::uuid`;
    });
    return ok({ undone: true, batchId });
  },
});

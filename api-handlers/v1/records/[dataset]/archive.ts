import { route, ok, parse } from '../../../../server/http';
import { sql, tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import { archiveBatch, dataset } from '../../../../server/dashboard';

export default route({
  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['Admin', 'Encoder'] });
    const kind = dataset(c.query.dataset);
    const body = parse(archiveBatch, c.body);
    const changed = await tx(session.id, async (q) => {
      const rows = await q`
        update ekapon.dashboard_records
           set archived = ${body.archived}, updated_at = now()
         where dataset = ${kind} and record_id = any(${body.ids.map(String)}::text[])
        returning record_id`;
      return rows.length;
    });
    return ok({ changed, archived: body.archived });
  },
});

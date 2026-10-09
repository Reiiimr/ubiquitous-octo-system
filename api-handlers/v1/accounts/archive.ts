import { route, ok, parse } from '../../../server/http';
import { tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { archiveBody } from '../../../server/accountSchemas';
import { forbidden } from '../../../server/errors';

/** Batch archive / restore (the checkbox actions in the prototype). Archived accounts cannot sign in. */
export default route({
  POST: async (c) => {
    const s = await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const b = parse(archiveBody, c.body);
    if (b.ids.includes(s.id)) throw forbidden('You cannot archive your own account.');
    const n = await tx(s.id, async (q) => (await q`select ekapon.archive_records('accounts', ${b.ids}::bigint[], ${b.restore}) as n`)[0].n as number);
    return ok({ changed: n, restore: b.restore });
  },
});

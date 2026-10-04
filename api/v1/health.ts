import { route, ok } from '../../server/http';
import { sql } from '../../server/db';

export default route({
  GET: async () => {
    await sql()`select 1`;
    return ok({ ok: true, time: new Date().toISOString() });
  },
});

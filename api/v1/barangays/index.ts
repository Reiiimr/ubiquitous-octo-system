import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql } from '../../../server/db';
import { likePattern } from '../../../server/listing';

const query = z.object({ q: z.string().trim().max(60).optional(), district: z.enum(['1', '2']).optional() });

/** Public reference list (used by the pre-listing page). Cached for an hour. */
export default route({
  GET: async (c) => {
    const { q, district } = parse(query, c.query);
    const rows = await sql()`
      select id, acronym, name::text as name, district, district_label, zip from ekapon.barangays
       where (${q ?? null}::text is null or name ilike ${likePattern(q ?? '')} or acronym ilike ${likePattern(q ?? '')})
         and (${district ?? null}::text is null or district = ${district ?? 0}::int)
       order by name`;
    return ok({ data: rows.map((r) => ({ id: r.id, acronym: r.acronym, name: r.name, district: r.district_label, zip: r.zip })), total: rows.length });
  },
}, { cache: 'public, max-age=3600' });

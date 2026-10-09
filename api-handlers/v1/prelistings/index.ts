import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { route, ok, created, parse } from '../../../server/http';
import { sql } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { listQuery } from '../../../server/listing';
import { unprocessable } from '../../../server/errors';

const petSchema = z.object({
  name: z.string().trim().min(1).max(80),
  species: z.enum(['Dog', 'Cat']),
  sex: z.enum(['Male', 'Female']),
  age: z.number().finite().min(0).max(50),
});
const submission = z.object({
  owner: z.string().trim().min(1).max(120),
  mobile: z.string().trim().regex(/^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/),
  barangay: z.string().trim().min(2).max(60),
  program: z.enum(['Kapon (spay / neuter)', 'Anti-rabies', 'Microchip', 'Lahat / All three']),
  pets: z.array(petSchema).min(1).max(10),
});
const query = listQuery.pick({ page: true, pageSize: true });

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'] });
    const f = parse(query, c.query);
    const [{ total }] = await sql()`
      select count(*)::int as total from ekapon.prelistings
       where (${session.type !== 'Paravet'} or barangay_id = ${session.barangayId ?? -1})`;
    const rows = await sql()`
      select p.reference, p.owner_name, p.mobile, b.name as barangay, p.program, p.pets,
             (p.submitted_at at time zone 'Asia/Manila')::date::text as date
        from ekapon.prelistings p
        join ekapon.barangays b on b.id = p.barangay_id
        where (${session.type !== 'Paravet'} or p.barangay_id = ${session.barangayId ?? -1})
       order by p.submitted_at desc, p.reference
       limit ${f.pageSize} offset ${(f.page - 1) * f.pageSize}`;
    return ok({
      data: rows.map((row) => ({
        ref: row.reference, owner: row.owner_name, mobile: row.mobile, barangay: row.barangay,
        program: row.program, pets: row.pets, date: row.date,
      })),
      page: f.page, pageSize: f.pageSize, total,
    });
  },

  POST: async (c) => {
    const body = parse(submission, c.body);
    const [{ id: barangayId }] = await sql()`select ekapon.find_barangay(${body.barangay}) as id`;
    if (!barangayId) throw unprocessable('UNKNOWN_BARANGAY', 'Choose one of the 62 official barangays.', { field: 'barangay' });
    const reference = `DS-${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).slice(0, 4)}-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
    await sql()`
      insert into ekapon.prelistings (reference, owner_name, mobile, barangay_id, program, pets)
      values (${reference}, ${body.owner}, ${body.mobile.replace(/\s/g, '-').replace(/--+/g, '-')},
              ${barangayId}, ${body.program}, ${sql().json(body.pets)})`;
    return created({ ref: reference });
  },
});

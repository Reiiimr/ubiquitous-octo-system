import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { record } from '../../../server/dashboard';
import { appendCensusSubmission, type CensusRecord } from '../../../server/censusSubmissions';
import { forbidden } from '../../../server/errors';
import { listQuery } from '../../../server/listing';

const censusDataset = z.enum(['respondents', 'households', 'animals']);
const bodySchema = z.object({
  submissionId: z.string().uuid(),
  label: z.string().trim().min(1).max(160),
  records: z.array(z.object({ dataset: censusDataset, record })).min(1).max(100),
});
const querySchema = listQuery.pick({ page: true, pageSize: true }).extend({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending'),
});

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'] });
    const query = parse(querySchema, c.query);
    const [{ total }] = await sql()`
      select count(*)::int as total
        from ekapon.census_submissions s
       where (${query.status} = 'all' or s.status = ${query.status})
         and (${session.type !== 'Paravet'} or s.actor_id = ${session.id})`;
    const rows = await sql()`
      select s.submission_id, s.label, s.status, s.records, s.created_at,
             s.reviewed_at, s.review_note, b.name as barangay,
             s.submitter_name as submitter, reviewer.full_name as reviewer
        from ekapon.census_submissions s
        join ekapon.barangays b on b.id = s.barangay_id
        left join ekapon.accounts reviewer on reviewer.id = s.reviewed_by
       where (${query.status} = 'all' or s.status = ${query.status})
         and (${session.type !== 'Paravet'} or s.actor_id = ${session.id})
       order by s.created_at desc
       limit ${query.pageSize} offset ${(query.page - 1) * query.pageSize}`;
    return ok({
      data: rows.map((row) => ({
        id: row.submission_id,
        label: row.label,
        status: row.status,
        recordCount: (row.records as CensusRecord[]).length,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewNote: row.review_note,
        barangay: row.barangay,
        submitter: row.submitter,
        reviewer: row.reviewer,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    });
  },

  POST: async (c) => {
    const session = await requireAuth(c.req, { roles: ['Paravet'] });
    const barangayId = session.barangayId;
    if (!barangayId) throw forbidden('Your account must be assigned to a barangay before submitting census data.');
    const body = parse(bodySchema, c.body);
    const count = await tx(session.id, async (q) => {
      return appendCensusSubmission(q, {
        submissionId: body.submissionId,
        actorId: session.id,
        submitterName: session.name,
        barangayId,
        label: body.label,
        records: body.records as CensusRecord[],
      });
    });
    return ok({ submissionId: body.submissionId, status: 'pending', recordCount: count });
  },
});

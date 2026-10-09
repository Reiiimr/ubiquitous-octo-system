import { z } from 'zod';
import { route, ok, parse } from '../../../../server/http';
import { sql, tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import type { CensusRecord } from '../../../../server/censusSubmissions';
import { forbidden, notFound } from '../../../../server/errors';

const idSchema = z.string().uuid();
const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).default(''),
});

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'] });
    const id = parse(idSchema, c.query.id);
    const [row] = await sql()`
      select s.submission_id, s.label, s.status, s.records, s.created_at,
             s.reviewed_at, s.review_note, b.name as barangay,
             s.submitter_name as submitter, reviewer.full_name as reviewer
        from ekapon.census_submissions s
        join ekapon.barangays b on b.id = s.barangay_id
        left join ekapon.accounts reviewer on reviewer.id = s.reviewed_by
       where s.submission_id = ${id}::uuid
         and (${session.type !== 'Paravet'} or s.actor_id = ${session.id})`;
    if (!row) throw notFound('Census submission not found.');
    return ok({
      submission: {
        id: row.submission_id,
        label: row.label,
        status: row.status,
        records: row.records as CensusRecord[],
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewNote: row.review_note,
        barangay: row.barangay,
        submitter: row.submitter,
        reviewer: row.reviewer,
      },
    });
  },

  PUT: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin'] });
    const id = parse(idSchema, c.query.id);
    const body = parse(decisionSchema, c.body);
    const result = await tx(session.id, async (q) => {
      const [submission] = await q`
        select actor_id, barangay_id, records, status
          from ekapon.census_submissions
         where submission_id = ${id}::uuid
         for update`;
      if (!submission) throw notFound('Census submission not found.');
      if (submission.status !== 'pending') throw forbidden('This census submission has already been reviewed.');
      const records = submission.records as CensusRecord[];
      if (body.decision === 'approve') {
        const [barangay] = await q`
          select name from ekapon.barangays where id = ${submission.barangay_id}
        `;
        for (const item of records) {
          if (typeof item.record.barangay !== 'string'
            || item.record.barangay.trim().toLowerCase() !== String(barangay?.name ?? '').toLowerCase()) {
            throw forbidden('This submission contains census records outside its assigned barangay.');
          }
          const [existing] = await q`
            select record_data->>'barangay' as barangay
              from ekapon.dashboard_records
             where dataset = ${item.dataset} and record_id = ${String(item.record.id)}
             for update`;
          if (existing) {
            const sameBarangay = String(existing.barangay ?? '').trim().toLowerCase()
              === String(barangay?.name ?? '').trim().toLowerCase();
            throw forbidden(sameBarangay
              ? `Approval stopped: ${item.dataset} record ${String(item.record.id)} already exists in this barangay. Review and resolve this match before approving.`
              : `Approval stopped: ${item.dataset} record ${String(item.record.id)} already belongs to another barangay.`);
          }
          const [inserted] = await q`
            insert into ekapon.dashboard_records as current_record
              (dataset, record_id, record_data, archived)
            values (
              ${item.dataset}, ${String(item.record.id)},
              ${q.json(JSON.parse(JSON.stringify(item.record)))}, false
            )
            on conflict (dataset, record_id) do nothing
            returning record_id`;
          if (!inserted) {
            throw forbidden(`Approval stopped: ${item.dataset} record ${String(item.record.id)} was added concurrently. Review the match before approving.`);
          }
        }
      }
      await q`
        update ekapon.census_submissions
           set status = ${body.decision === 'approve' ? 'approved' : 'rejected'},
               reviewed_by = ${session.id}, reviewed_at = now(),
               review_note = ${body.note || null}
         where submission_id = ${id}::uuid`;
      await q`select ekapon.log_activity(
        ${body.decision === 'approve' ? 'Census submission approved and applied' : 'Census submission rejected'},
        ${JSON.stringify({ submissionId: id, records: records.length, note: body.note })}
      )`;
      return records.length;
    });
    return ok({
      submissionId: id,
      status: body.decision === 'approve' ? 'approved' : 'rejected',
      applied: body.decision === 'approve' ? result : 0,
    });
  },
});

import type { Tx } from './db';
import { forbidden, unprocessable } from './errors';

export interface CensusRecord {
  dataset: 'respondents' | 'households' | 'animals';
  record: Record<string, unknown>;
}

export async function appendCensusSubmission(
  q: Tx,
  input: {
    submissionId: string;
    actorId: number;
    submitterName: string;
    barangayId: number;
    label: string;
    records: CensusRecord[];
  },
): Promise<number> {
  const [barangay] = await q`
    select name from ekapon.barangays where id = ${input.barangayId}
  `;
  if (!barangay) throw forbidden('Your account must be assigned to a valid barangay before submitting census data.');
  for (const item of input.records) {
    if (typeof item.record.barangay !== 'string' || item.record.barangay.trim().toLowerCase() !== String(barangay.name).toLowerCase()) {
      throw forbidden('Paravets can only submit census records for their assigned barangay.');
    }
    if (Buffer.byteLength(JSON.stringify(item.record), 'utf8') > 20_000) {
      throw unprocessable('RECORD_TOO_LARGE', 'Each record must be 20 KB or smaller.');
    }
  }

  await q`
    insert into ekapon.census_submissions
      (submission_id, actor_id, submitter_name, barangay_id, label, records)
    values (
      ${input.submissionId}::uuid, ${input.actorId}, ${input.submitterName}, ${input.barangayId},
      ${input.label}, ${q.json(JSON.parse(JSON.stringify(input.records)))}
    )
    on conflict (submission_id) do nothing`;
  const [submission] = await q`
    select actor_id, barangay_id, label, records, status
      from ekapon.census_submissions
     where submission_id = ${input.submissionId}::uuid
     for update`;
  if (!submission || Number(submission.actor_id) !== input.actorId) {
    throw forbidden('This submission belongs to another account.');
  }
  if (Number(submission.barangay_id) !== input.barangayId || submission.status !== 'pending') {
    throw forbidden('This census submission can no longer be changed.');
  }

  const records = new Map<string, CensusRecord>(
    (submission.records as CensusRecord[]).map((item) => [`${item.dataset}:${String(item.record.id)}`, item]),
  );
  for (const item of input.records) {
    records.set(`${item.dataset}:${String(item.record.id)}`, item);
  }
  if (records.size > 1000) {
    throw unprocessable('SUBMISSION_TOO_LARGE', 'A census submission cannot contain more than 1,000 records.');
  }
  const combined = [...records.values()];
  await q`
    update ekapon.census_submissions
       set label = ${input.label}, records = ${q.json(JSON.parse(JSON.stringify(combined)))}
     where submission_id = ${input.submissionId}::uuid`;
  return combined.length;
}

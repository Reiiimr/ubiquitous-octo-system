import { route, ok } from '../../../server/http';
import { sql } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { ACCOUNT_BASE } from '../../../server/accountsView';

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const backup = await sql().begin(async (q) => {
      await q`set transaction isolation level repeatable read, read only`;
      const [accounts, barangays, records, prelistings, activity, controls] = await Promise.all([
        q.unsafe(`select * from (${ACCOUNT_BASE}) x order by x.id`),
        q`select * from ekapon.barangays order by id`,
        q`select dataset, record_id, record_data, archived, created_at, updated_at from ekapon.dashboard_records order by dataset, record_id`,
        q`select reference, owner_name, mobile, barangay_id, program, pets, submitted_at from ekapon.prelistings order by submitted_at, reference`,
        q`select id, table_name, record_id, operation, account_id,
                 old_data - array['password_hash', 'token', 'secret', 'access_token', 'refresh_token'] as old_data,
                 new_data - array['password_hash', 'token', 'secret', 'access_token', 'refresh_token'] as new_data, created_at
            from ekapon.audit_log order by id`,
        q`select setting_key, setting_value, updated_at from ekapon.system_settings
           union all
         select 'feature_access:' || account_type || ':' || feature_key, to_jsonb(enabled), updated_at
           from ekapon.role_feature_access order by 1`,
      ]);
      return {
        format: 'cityvet-supabase-backup-v1',
        exportedAt: new Date().toISOString(),
        exportedBy: { accountId: session.id, username: session.username },
        contains: {
          accounts: accounts.length,
          barangays: barangays.length,
          dashboardRecords: records.length,
          prelistings: prelistings.length,
          auditEntries: activity.length,
        },
        data: { accounts, barangays, dashboardRecords: records, prelistings, auditLog: activity, controls },
      };
    });
    return ok(backup, { 'Content-Disposition': `attachment; filename="cityvet-backup-${new Date().toISOString().slice(0, 10)}.json"` });
  },
});

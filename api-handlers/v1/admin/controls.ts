import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';

const featureKeys = [
  'operations', 'registry', 'field-team', 'reports', 'data-quality',
  'data-management', 'settings',
] as const;
const featureChange = z.object({
  accountType: z.enum(['Admin', 'Paravet']),
  featureKey: z.enum(featureKeys),
  enabled: z.boolean(),
});
const changes = z.object({
  maintenanceMode: z.boolean().optional(),
  featureAccess: z.array(featureChange).max(14).optional(),
}).refine((value) => value.maintenanceMode !== undefined || value.featureAccess !== undefined);

export default route({
  GET: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin', 'Admin', 'Paravet'], allowMaintenance: true });
    const [system] = await sql()`
      select setting_value as maintenance_mode
        from ekapon.system_settings where setting_key = 'maintenance_mode'`;
    const featureAccess = await sql()`
      select account_type, feature_key, enabled
        from ekapon.role_feature_access
       order by account_type, feature_key`;
    return ok({
      role: session.type,
      maintenanceMode: system?.maintenance_mode === true,
      featureAccess: featureAccess.map((row) => ({
        accountType: row.account_type,
        featureKey: row.feature_key,
        enabled: row.enabled,
      })),
    });
  },

  PUT: async (c) => {
    const session = await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const body = parse(changes, c.body);
    await tx(session.id, async (q) => {
      if (body.maintenanceMode !== undefined) {
        await q`
          update ekapon.system_settings
             set setting_value = ${JSON.stringify(body.maintenanceMode)}::jsonb, updated_at = now()
           where setting_key = 'maintenance_mode'`;
      }
      for (const item of body.featureAccess ?? []) {
        await q`
          insert into ekapon.role_feature_access (account_type, feature_key, enabled)
          values (${item.accountType}, ${item.featureKey}, ${item.enabled})
          on conflict (account_type, feature_key) do update
             set enabled = excluded.enabled, updated_at = now()`;
      }
      await q`select ekapon.log_activity('System access settings updated', ${JSON.stringify({
        maintenanceMode: body.maintenanceMode,
        featureChanges: body.featureAccess?.length ?? 0,
      })})`;
    });
    return ok({ saved: true });
  },
});

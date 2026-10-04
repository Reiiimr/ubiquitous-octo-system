import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { tx } from '../../../server/db';
import { requireAuth, sessionCookie } from '../../../server/auth';

const body = z.object({ newPassword: z.string().min(8).max(200), confirmPassword: z.string().min(1).max(200) })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'The passwords do not match.', path: ['confirmPassword'] });

/** Step 2: mandatory "Create New Password". Only reachable with the restricted session from first-signin. */
export default route({
  POST: async (c) => {
    const s = await requireAuth(c.req, { scope: 'reset' });
    const { newPassword } = parse(body, c.body);
    await tx(s.id, (q) => q`select ekapon.set_permanent_password(${s.id}::bigint, ${newPassword})`);
    return ok({ account: { id: s.id, type: s.type, name: s.name, accountKey: s.key } }, { 'Set-Cookie': await sessionCookie({ id: s.id, type: s.type }, 'full') });
  },
});

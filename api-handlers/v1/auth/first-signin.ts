import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { sessionCookie } from '../../../server/auth';
import { AppError } from '../../../server/errors';
import { config } from '../../../server/config';

const body = z.object({ accountKey: z.string().trim().min(5).max(40), temporaryPassword: z.string().min(1).max(40) });

/**
 * Step 1 for Paravets and users: the one-time temporary password (valid 15 minutes, 3 tries).
 * Success returns a restricted 10-minute session that can ONLY be used to create the permanent password.
 */
export default route({
  POST: async (c) => {
    const { accountKey, temporaryPassword } = parse(body, c.body);
    if (c.ip) {
      const [{ n }] = await sql()`select ekapon.recent_failed_logins(${c.ip}::inet, 15) as n`;
      if (n >= config().loginIpMaxFailures) throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Please wait 15 minutes and try again.');
    }
    const [r] = await tx(null, (q) => q`select * from ekapon.verify_temp_password(${accountKey}, ${temporaryPassword}, ${c.ip}::inet)`);
    if (!r.o_ok) {
      if (r.o_reason === 'locked') throw new AppError(423, 'ACCOUNT_LOCKED', 'Too many wrong attempts. Ask the administrator for a new temporary password.');
      if (r.o_reason === 'expired') throw new AppError(410, 'TEMP_PASSWORD_EXPIRED', 'The temporary password has expired. Ask the administrator for a new one.');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'The account key or temporary password is incorrect.', r.o_attempts_left != null ? { attemptsLeft: r.o_attempts_left } : undefined);
    }
    const [a] = await sql()`select id, account_type::text as type from ekapon.accounts where id = ${r.o_account_id}`;
    return ok({ mustCreatePassword: true }, { 'Set-Cookie': await sessionCookie({ id: a.id, type: a.type }, 'reset') });
  },
});

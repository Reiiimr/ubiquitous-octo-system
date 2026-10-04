import { z } from 'zod';
import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { sessionCookie } from '../../../server/auth';
import { AppError } from '../../../server/errors';
import { config } from '../../../server/config';

const body = z.object({ identifier: z.string().trim().min(1).max(64), password: z.string().min(1).max(200) });

/** Staff sign in with a username; Paravets and users with their account key, once they have a permanent password. */
export default route({
  POST: async (c) => {
    const { identifier, password } = parse(body, c.body);
    if (c.ip) {
      const [{ n }] = await sql()`select ekapon.recent_failed_logins(${c.ip}::inet, 15) as n`;
      if (n >= config().loginIpMaxFailures) throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed sign-in attempts. Please wait 15 minutes and try again.');
    }
    const [r] = await tx(null, (q) => q`select * from ekapon.verify_password(${identifier}, ${password}, ${c.ip}::inet)`);
    if (!r.o_ok) {
      switch (r.o_reason) {
        case 'locked': throw new AppError(423, 'ACCOUNT_LOCKED', 'This account is locked. Wait 15 minutes or ask the administrator.');
        case 'use_temporary_password':
        case 'must_reset': throw new AppError(403, 'FIRST_SIGN_IN_REQUIRED', 'Use the first sign-in with your temporary password to create a new password.');
        default: throw new AppError(401, 'INVALID_CREDENTIALS', 'The username/account key or password is incorrect.');
      }
    }
    const [a] = await sql()`select id, account_type::text as type, full_name, username::text as username, account_key from ekapon.accounts where id = ${r.o_account_id}`;
    return ok({ account: { id: a.id, type: a.type, name: a.full_name, username: a.username, accountKey: a.account_key } }, { 'Set-Cookie': await sessionCookie({ id: a.id, type: a.type }, 'full') });
  },
});

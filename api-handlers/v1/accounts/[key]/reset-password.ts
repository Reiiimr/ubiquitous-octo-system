import { route, ok, parse } from '../../../../server/http';
import { tx } from '../../../../server/db';
import { requireAuth } from '../../../../server/auth';
import { findAccount, toAccount } from '../../../../server/accountsView';
import { accountRef } from '../../../../server/accountSchemas';
import { forbidden, notFound } from '../../../../server/errors';

/** Issues a fresh temporary password (the old one stops working). Also unlocks a locked account. */
export default route({
  POST: async (c) => {
    const s = await requireAuth(c.req, { roles: ['SuperAdmin'] });
    const a = await findAccount(parse(accountRef, c.query.key));
    if (!a) throw notFound('Account not found.');
    if (a.account_type !== 'Paravet' && a.account_type !== 'User') throw forbidden('Temporary passwords are only for Paravet and User accounts.');
    const pw = await tx(s.id, async (q) => (await q`select ekapon.issue_temp_password(${a.id}::bigint) as pw`)[0].pw as string);
    return ok({ account: toAccount((await findAccount(String(a.id)))!), temporaryPassword: pw, expiresInMinutes: 15, notice: 'Shown once. It expires in 15 minutes.' });
  },
});

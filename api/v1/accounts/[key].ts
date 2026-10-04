import { route, ok, parse } from '../../../server/http';
import { sql, tx } from '../../../server/db';
import { requireAuth } from '../../../server/auth';
import { findAccount, toAccount } from '../../../server/accountsView';
import { accountRef, updateAccount } from '../../../server/accountSchemas';
import { AppError, forbidden, notFound, unprocessable } from '../../../server/errors';

async function load(ref: string) {
  const a = await findAccount(parse(accountRef, ref));
  if (!a) throw notFound('Account not found.');
  return a;
}
const portalOnly = (type: string) => { if (type !== 'Paravet' && type !== 'User') throw forbidden('Staff accounts cannot be changed here.'); };

export default route({
  GET: async (c) => {
    await requireAuth(c.req, { roles: ['Admin'] });
    return ok({ account: toAccount(await load(c.query.key)) });
  },

  PATCH: async (c) => {
    const s = await requireAuth(c.req, { roles: ['Admin'] });
    const a = await load(c.query.key);
    portalOnly(a.account_type);
    const b = parse(updateAccount, c.body);
    const set: Record<string, unknown> = {};
    if (b.firstName !== undefined) set.first_name = b.firstName;
    if (b.lastName !== undefined) set.last_name = b.lastName;
    if (b.middleName !== undefined) set.middle_name = b.middleName || null;
    if (b.suffix !== undefined) set.suffix = b.suffix || null;
    if (b.mobile !== undefined) set.mobile = b.mobile;
    if (b.barangay !== undefined) {
      const [{ id }] = await sql()`select ekapon.find_barangay(${b.barangay}) as id`;
      if (!id) throw unprocessable('UNKNOWN_BARANGAY', 'Choose one of the 62 official barangays.', { field: 'barangay' });
      set.barangay_id = id;   // the account key never changes, even if the barangay does
    }
    await tx(s.id, (q) => q`update ekapon.accounts set ${q(set)} where id = ${a.id}`);
    return ok({ account: toAccount(await load(String(a.id))) });
  },

  DELETE: async (c) => {
    const s = await requireAuth(c.req, { roles: ['Admin'] });
    const a = await load(c.query.key);
    portalOnly(a.account_type);
    if (a.id === s.id) throw forbidden('You cannot delete your own account.');
    try {
      await tx(s.id, async (q) => {
        await q`select ekapon.log_activity('Account deleted', ${a.account_key})`;
        await q`delete from ekapon.accounts where id = ${a.id}`;
      });
    } catch (e) {
      if ((e as { code?: string }).code === '23503') throw new AppError(409, 'ACCOUNT_IN_USE', 'This account is referenced by other records. Archive it instead.');
      throw e;
    }
    return ok({ deleted: true });
  },
});

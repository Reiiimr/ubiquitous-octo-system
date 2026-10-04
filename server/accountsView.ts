import { sql, type Tx } from './db';

/** Effective status: an expired temporary password shows as expired immediately, even before the cleanup job runs. */
export const ACCOUNT_BASE = `
  select a.id, a.account_key, a.username::text as username, a.account_type::text as account_type, a.first_name, a.middle_name, a.last_name, a.suffix,
         a.full_name, a.mobile, a.barangay_id, b.name::text as barangay, b.acronym as barangay_acronym, a.paravet_id, a.owner_id,
         case when a.status = 'Temporary password pending' and exists (
                select 1 from ekapon.temp_credentials t
                 where t.account_id = a.id and t.used_at is null and t.destroyed_at is null and t.locked_at is null and t.expires_at <= now())
              then 'Temporary password expired' else a.status::text end as status,
         a.created_at, (a.created_at at time zone 'Asia/Manila')::date::text as created_on, a.last_login_at, (a.archived_at is not null) as archived
    from ekapon.accounts a left join ekapon.barangays b on b.id = a.barangay_id`;

export interface AccountRow {
  id: number; account_key: string | null; username: string | null; account_type: string; first_name: string; middle_name: string | null;
  last_name: string; suffix: string | null; full_name: string; mobile: string | null; barangay_id: number | null; barangay: string | null;
  barangay_acronym: string | null; paravet_id: number | null; owner_id: number | null; status: string; created_at: Date; created_on: string;
  last_login_at: Date | null; archived: boolean;
}

export const toAccount = (r: AccountRow) => ({
  id: r.id,
  accountKey: r.account_key,
  username: r.username,
  accountType: r.account_type,
  firstName: r.first_name,
  middleName: r.middle_name,
  lastName: r.last_name,
  suffix: r.suffix,
  fullName: r.full_name,
  mobile: r.mobile,
  barangay: r.barangay_id ? { id: r.barangay_id, name: r.barangay, acronym: r.barangay_acronym } : null,
  paravetId: r.paravet_id,
  ownerId: r.owner_id,
  status: r.status,
  createdAt: r.created_at,
  createdOn: r.created_on,
  lastLoginAt: r.last_login_at,
  archived: r.archived,
});

/** Finds one account by key (PV2026-TMP001-3023) or numeric id. Works inside or outside a transaction. */
export async function findAccount(ref: string, q: Tx | ReturnType<typeof sql> = sql()): Promise<AccountRow | undefined> {
  const isId = /^\d+$/.test(ref);
  const rows = await q.unsafe(`select * from (${ACCOUNT_BASE}) x where ${isId ? 'x.id = $1::bigint' : 'x.account_key = $1'}`, [isId ? ref : ref.toUpperCase()]);
  return rows[0] as unknown as AccountRow | undefined;
}

import postgres from 'postgres';
import { config } from './config';

export type Sql = postgres.Sql<any>;
export type Tx = postgres.TransactionSql<any>;

let client: Sql | undefined;

/** Lazily creates one pooled client per serverless instance. `prepare: false` is required for Supabase's transaction pooler (port 6543). */
export function sql(): Sql {
  if (!client) {
    const url = config().databaseUrl;
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    client = postgres(url, {
      ssl: local ? false : 'require',
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      onnotice: () => {},
      types: {
        // bigint -> JS number (ids and counts stay far below 2^53)
        bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
        // date -> 'YYYY-MM-DD' string (no timezone shifting)
        date: { to: 1082, from: [1082], serialize: (x: unknown) => String(x), parse: (x: string) => x },
      },
    });
  }
  return client;
}

/**
 * Runs `fn` inside a transaction. When `accountId` is given, the transaction records it as `app.account_id`
 * so the database audit log knows who made the change.
 * All SQL in this project is schema-qualified (ekapon.*), so no search_path is needed.
 */
export async function tx<T>(accountId: number | null, fn: (q: Tx) => Promise<T>): Promise<T> {
  return sql().begin(async (q) => {
    if (accountId) await q`select set_config('app.account_id', ${String(accountId)}, true)`;
    return fn(q);
  }) as Promise<T>;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 2 });
    client = undefined;
  }
}

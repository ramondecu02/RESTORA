// Acceso a Postgres. Toda consulta de datos de un negocio pasa por withTenant():
// abre una transacción, cambia al rol sin privilegios restora_app y fija app.tenant_id,
// de modo que las políticas RLS filtran por negocio aunque el código olvide un WHERE.
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env";

types.setTypeParser(1700, (x) => (x === null ? null : parseFloat(x))); // numeric → number
types.setTypeParser(20, (x) => (x === null ? null : parseInt(x, 10))); // int8 → number
types.setTypeParser(1082, (x) => x); // date → 'AAAA-MM-DD'

const g = globalThis as unknown as { __restoraPool?: Pool };

export function pool(): Pool {
  if (!g.__restoraPool) {
    const url = env.databaseUrl;
    if (!url) throw new Error("Falta DATABASE_URL");
    const p = new Pool({
      connectionString: url,
      max: Number(process.env.PG_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
    });
    p.on("error", (e) => console.error("[db] conexión perdida", e.message));
    g.__restoraPool = p;
  }
  return g.__restoraPool;
}

export type Db = PoolClient;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

/** Transacción sobre tablas globales (usuarios, sesiones, negocios, catálogo). */
export async function sys<T>(fn: (c: Db) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Transacción aislada a un negocio (RLS). */
export async function withTenant<T>(tenantId: string, fn: (c: Db) => Promise<T>): Promise<T> {
  if (!isUuid(tenantId)) throw new Error("Negocio no válido");
  return sys(async (c) => {
    await c.query("set local role restora_app");
    await c.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
    return fn(c);
  });
}

export async function all<T extends QueryResultRow = QueryResultRow>(c: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  return (await c.query<T>(sql, params)).rows;
}
export async function one<T extends QueryResultRow = QueryResultRow>(c: Db, sql: string, params: unknown[] = []): Promise<T | null> {
  return (await c.query<T>(sql, params)).rows[0] ?? null;
}

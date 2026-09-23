// Aplica las migraciones SQL pendientes (db/migrations/*.sql) en orden.
// Usa DATABASE_URL_UNPOOLED si existe (conexión directa, recomendada para DDL) o DATABASE_URL.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import pg from 'pg';

const here = new URL('..', import.meta.url).pathname;
for (const f of ['.env.local', '.env']) {
  if (!existsSync(here + f)) continue;
  for (const line of readFileSync(here + f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (process.env.SKIP_MIGRATIONS_IF_NO_DB === '1') { console.log('[migrate] sin DATABASE_URL: se omite'); process.exit(0); }
  console.error('[migrate] Falta DATABASE_URL. Conecta una base de datos Postgres (Neon) al proyecto.');
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('select pg_advisory_lock(727274)');
  await client.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await client.query('select version from schema_migrations')).rows.map((r) => r.version));
  const files = readdirSync(here + 'db/migrations').filter((f) => f.endsWith('.sql')).sort();
  let n = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = readFileSync(here + 'db/migrations/' + f, 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (version) values ($1)', [f]);
      await client.query('commit');
      console.log('[migrate] aplicada', f); n++;
    } catch (e) {
      await client.query('rollback');
      console.error('[migrate] error en', f, '→', e.message);
      process.exitCode = 1;
      break;
    }
  }
  if (!n && !process.exitCode) console.log('[migrate] base de datos al día');
} finally {
  await client.query('select pg_advisory_unlock(727274)').catch(() => {});
  await client.end();
}

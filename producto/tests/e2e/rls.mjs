// Aislamiento entre negocios. Crea dos negocios reales por la interfaz (A y B, con datos de ejemplo,
// un pedido y una carta subida) y comprueba:
//  1) En la base de datos, con el rol de la app y el contexto de A, ninguna tabla de negocio deja
//     leer, cambiar, borrar ni crear filas de B; sin contexto no se ve nada; las tablas globales
//     sensibles no son accesibles.
//  2) Por HTTP, la sesión de A recibe 404 en las páginas y archivos de B.
import pg from "pg";
import { BASE, DB, launch, sql, signup, cargarDemo } from "./lib.mjs";

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log("✗", msg); } };
const b = await launch();

async function negocio(tag) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, locale: "es-ES" });
  const page = await ctx.newPage();
  const email = `rls-${tag}+${Date.now()}@example.com`;
  await signup(page, { email, negocio: `Negocio ${tag}` });
  await cargarDemo(page);
  // Un pedido (pedidos, pedido_lineas) y una carta subida (documento_archivos)
  await page.goto(BASE + "/inventario");
  await page.getByRole("button", { name: /Preparar pedido/ }).click();
  await page.getByRole("button", { name: "Guardar pedido" }).filter({ visible: true }).first().click();
  await page.waitForTimeout(800);
  await page.goto(BASE + "/carta/subir");
  await page.getByRole("button", { name: /Probar con una carta de ejemplo/ }).click();
  await page.waitForURL(/\/carta\/subir\/[0-9a-f-]{36}/, { timeout: 30000 });
  const [t] = await sql("select m.org_id as id from memberships m join users u on u.id = m.user_id where lower(u.email) = lower($1)", [email]);
  console.log(`· negocio ${tag} creado (${t.id})`);
  return { id: t.id, ctx, page };
}

const A = await negocio("A");
const B = await negocio("B");

// ---------- 1) Base de datos ----------
const tables = (await sql(`select c.relname as t from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped) order by 1`)).map((r) => r.t);
const counts = async (t, tenant) => (await sql(`select count(*)::int as n from ${t} where tenant_id = $1`, [tenant]))[0].n;

async function asApp(tenant, fn) {
  const c = new pg.Client({ connectionString: DB });
  await c.connect();
  try {
    await c.query("begin");
    await c.query("set local role restora_app");
    if (tenant) await c.query("select set_config('app.tenant_id', $1, true)", [tenant]);
    return await fn(c);
  } finally { await c.query("rollback").catch(() => {}); await c.end(); }
}
const tryQ = async (c, q, p = []) => { await c.query("savepoint s"); try { const r = await c.query(q, p); await c.query("release savepoint s"); return { ok: true, r }; } catch (e) { await c.query("rollback to savepoint s"); return { ok: false, e }; } };

const cols = new Map();
for (const t of tables) cols.set(t, (await sql(`select column_name, column_default from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`, [t])));

for (const t of tables) {
  const nA = await counts(t, A.id), nB = await counts(t, B.id);
  ok(nB > 0, `${t}: B no tiene datos, la prueba no sería significativa`);
  await asApp(A.id, async (c) => {
    const vis = (await c.query(`select count(*)::int as n, count(*) filter (where tenant_id = $1)::int as b from ${t}`, [B.id])).rows[0];
    ok(vis.b === 0, `${t}: A ve ${vis.b} filas de B`);
    ok(vis.n === nA, `${t}: A ve ${vis.n} filas y tiene ${nA}`);
    const up = await tryQ(c, `update ${t} set tenant_id = tenant_id where tenant_id = $1`, [B.id]);
    ok(up.ok && up.r.rowCount === 0, `${t}: A puede modificar ${up.r?.rowCount} filas de B`);
    const del = await tryQ(c, `delete from ${t} where tenant_id = $1`, [B.id]);
    ok(del.ok && del.r.rowCount === 0, `${t}: A puede borrar ${del.r?.rowCount} filas de B`);
    if (nA > 0) {
      // Llevarse una fila propia a B: la política lo impide
      const mv = await tryQ(c, `update ${t} set tenant_id = $1 where ctid = (select ctid from ${t} limit 1)`, [B.id]);
      ok(!mv.ok && /row-level security/.test(mv.e.message), `${t}: A puede mover una fila a B (${mv.ok ? "sí" : mv.e.message})`);
      // Crear una fila en B copiando una propia
      const cs = cols.get(t).filter((x) => !(x.column_name === "id" && x.column_default));
      const list = cs.map((x) => `"${x.column_name}"`).join(", ");
      const sel = cs.map((x) => (x.column_name === "tenant_id" ? "$1::uuid" : `"${x.column_name}"`)).join(", ");
      const ins = await tryQ(c, `insert into ${t} (${list}) select ${sel} from ${t} limit 1`, [B.id]);
      ok(!ins.ok && /row-level security/.test(ins.e.message), `${t}: A puede crear filas en B (${ins.ok ? "sí" : ins.e.message})`);
    }
  });
  await asApp(null, async (c) => {
    const n = (await c.query(`select count(*)::int as n from ${t}`)).rows[0].n;
    ok(n === 0, `${t}: sin negocio en contexto se ven ${n} filas`);
  });
}
// Tablas globales sensibles: fuera del alcance del rol de la app
await asApp(A.id, async (c) => {
  for (const q of ["select password_hash from users limit 1", "select * from sessions limit 1", "select * from email_codes limit 1", "select * from invitations limit 1",
    "select * from memberships limit 1", "select * from organizations limit 1", "select * from outbox_emails limit 1", "update users set name = name"]) {
    const r = await tryQ(c, q);
    ok(!r.ok && /permission denied/.test(r.e.message), `rol de la app: «${q}» ${r.ok ? "permitido" : r.e.message}`);
  }
  const r = await tryQ(c, "select id, name from users limit 1");
  ok(r.ok, "rol de la app: puede leer el nombre de los usuarios");
});
console.log(`· base de datos: ${tables.length} tablas de negocio comprobadas`);

// ---------- 2) HTTP con la sesión de A ----------
const [bDoc] = await sql("select id from documentos where tenant_id = $1 and kind = 'albaran' limit 1", [B.id]);
const [bRec] = await sql("select id from recetas where tenant_id = $1 limit 1", [B.id]);
const [bArt] = await sql("select id from articulos where tenant_id = $1 limit 1", [B.id]);
const [bProv] = await sql("select id from proveedores where tenant_id = $1 limit 1", [B.id]);
const [bFile] = await sql("select storage_key from documento_archivos where tenant_id = $1 limit 1", [B.id]);
const [bCarta] = await sql("select id from documentos where tenant_id = $1 and kind = 'carta' limit 1", [B.id]);
const urls = [`/compras/${bDoc.id}`, `/escandallos/${bRec.id}`, `/articulos/${bArt.id}`, `/proveedores/${bProv.id}`, `/carta/subir/${bCarta.id}`,
  `/api/documentos/${bDoc.id}/estado`, `/api/archivos/${bFile.storage_key}`];
for (const u of urls) {
  const r = await A.page.request.get(BASE + u, { maxRedirects: 0 });
  const body = await r.text();
  ok(r.status() === 404 || r.status() === 403, `HTTP ${u}: A recibe ${r.status()}`);
  ok(!body.includes("Negocio B"), `HTTP ${u}: aparece el nombre de B`);
}
// Y B sí puede ver lo suyo (la prueba no es trivial)
const own = await B.page.request.get(BASE + `/compras/${bDoc.id}`);
ok(own.status() === 200, `HTTP: B ve su propio albarán (${own.status()})`);
const ownFile = await B.page.request.get(BASE + `/api/archivos/${bFile.storage_key}`);
ok(ownFile.status() === 200, `HTTP: B ve su propia carta subida (${ownFile.status()})`);

await b.close();
console.log(fails ? `\n✗ ${fails} de ${checks} comprobaciones fallidas` : `\n✓ ${checks} comprobaciones de aislamiento correctas`);
process.exit(fails ? 1 : 0);

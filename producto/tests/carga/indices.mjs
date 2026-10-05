// Qué índices le faltan a la base de datos con 50 negocios (Task 18 / B7 del plan). Dos comprobaciones sobre la base restora_carga
// (la que siembra scripts/seed-carga.mjs):
//
//   1. Estructura: claves foráneas cuya columna no encabeza ningún índice, y tablas con tenant_id sin ningún índice que empiece por
//      tenant_id. Una clave foránea sin índice no estorba al leer, pero cada vez que se borra una fila de la tabla a la que apunta (un albarán,
//      una importación de ventas, un artículo...) Postgres recorre ENTERA la tabla de los hijos —la de todos los negocios— para comprobarla.
//   2. Operaciones reales de la app, cada una con EXPLAIN (ANALYZE, BUFFERS) dentro de una transacción que se deshace (no cambia nada):
//      tiempo total, tiempo que se va en comprobar claves foráneas y tablas recorridas enteras. Las lecturas van con el rol de la app
//      (restora_app) y el negocio fijado, como en producción; los borrados también.
//
//   node --no-warnings tests/carga/indices.mjs                       informe en pantalla
//   node --no-warnings tests/carga/indices.mjs --etiqueta antes      y lo guarda en tests/carga/out/indices-antes.json
//   node --no-warnings tests/carga/indices.mjs --todas               también las claves foráneas de tablas pequeñas
//
// Las consultas son copia de las de la app (el archivo se indica en cada una) tal como estaban al escribir esto: si la app las cambia, hay
// que revisarlas aquí. Variable: CARGA_DATABASE_URL (por omisión, DATABASE_URL con la base restora_carga).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const arg = (n, def) => { const i = process.argv.indexOf("--" + n); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const base = new URL(process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev");
const URL_CARGA = process.env.CARGA_DATABASE_URL || (() => { const u = new URL(base); u.pathname = "/" + (process.env.CARGA_DB || "restora_carga"); return u.toString(); })();
if (!["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(new URL(URL_CARGA).hostname) && process.env.CARGA_PERMITIR_REMOTA !== "1") {
  console.error("[indices] la base no es local: este informe ejecuta borrados (deshechos) sobre datos sintéticos. Si es una base de pruebas tuya, CARGA_PERMITIR_REMOTA=1.");
  process.exit(1);
}
const NEGOCIO = String(arg("negocio", 28));
const REPETICIONES = Number(arg("repeticiones", 3));
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "—");
const mediana = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
const c = new pg.Client({ connectionString: URL_CARGA });
await c.connect();
console.log(`Base ${new URL(URL_CARGA).pathname.slice(1)} · negocio «Carga ${NEGOCIO}» · mediana de ${REPETICIONES} ejecuciones por operación\n`);

// ───────── 1. Estructura ─────────
const lideres = `select i.indrelid, (select attname from pg_attribute where attrelid = i.indrelid and attnum = i.indkey[0]) as lider from pg_index i where i.indisvalid`;
const sinIndiceFk = (await c.query(`
  with fk as (select c.conrelid, c.conrelid::regclass::text as tabla, a.attname as columna, c.confrelid::regclass::text as referencia,
      case c.confdeltype when 'c' then 'cascade' when 'n' then 'set null' else 'restrict' end as al_borrar
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1] where c.contype = 'f' and c.connamespace = 'public'::regnamespace),
  idx as (${lideres})
  select tabla, columna, referencia, al_borrar, (select reltuples::bigint from pg_class where oid = fk.conrelid) as filas
  from fk where not exists (select 1 from idx where idx.indrelid = fk.conrelid and idx.lider = fk.columna) order by filas desc, tabla, columna`)).rows
  .filter((x) => arg("todas", false) || Number(x.filas) >= 1000);
console.log(`Claves foráneas sin índice que empiece por su columna${arg("todas", false) ? "" : " (tablas de 1.000 filas o más)"}: ${sinIndiceFk.length}`);
console.log("  tabla.columna                          apunta a            al borrar el padre    filas de la tabla");
for (const x of sinIndiceFk) console.log(`  ${(x.tabla + "." + x.columna).padEnd(38)} ${x.referencia.padEnd(19)} ${x.al_borrar.padEnd(20)} ${String(Number(x.filas).toLocaleString("es-ES")).padStart(12)}`);
const sinTenant = (await c.query(`
  with idx as (select i.indrelid, (select attname from pg_attribute where attrelid = i.indrelid and attnum = i.indkey[0]) as lider from pg_index i where i.indisvalid)
  select cl.relname as tabla, cl.reltuples::bigint as filas from pg_class cl
  where cl.relnamespace = 'public'::regnamespace and cl.relkind = 'r'
    and exists (select 1 from pg_attribute a where a.attrelid = cl.oid and a.attname = 'tenant_id' and not a.attisdropped)
    and not exists (select 1 from idx where idx.indrelid = cl.oid and idx.lider = 'tenant_id') order by filas desc, tabla`)).rows;
console.log(`\nTablas con tenant_id sin ningún índice que empiece por tenant_id: ${sinTenant.length}`);
for (const x of sinTenant) console.log(`  ${x.tabla.padEnd(22)} ${String(Number(x.filas).toLocaleString("es-ES")).padStart(10)} filas`);

// ───────── 2. Operaciones ─────────
// Un negocio y datos reales suyos para dar valores a las consultas (con el rol del dueño de la base: sin RLS, solo para elegir ids)
const org = (await c.query("select o.id as org, l.id as local from organizations o join locales l on l.tenant_id = o.id where o.name = $1", ["Carga " + NEGOCIO])).rows[0];
if (!org) { console.error(`[indices] no hay un negocio «Carga ${NEGOCIO}»: ejecuta antes node scripts/seed-carga.mjs`); process.exit(1); }
const ev = (await c.query("select pe.documento_id, pe.articulo_id, d.saved_at from precio_eventos pe join documentos d on d.id = pe.documento_id where pe.tenant_id = $1 order by pe.fecha limit 1", [org.org])).rows[0];
const t = {
  org: org.org, local: org.local, ...ev,
  imp: (await c.query("select id from ventas_importes where local_id = $1 order by desde limit 1", [org.local])).rows[0]?.id,
  prov: (await c.query("select id from proveedores where local_id = $1 order by name limit 1", [org.local])).rows[0]?.id,
  ped: (await c.query("select id from pedidos where local_id = $1 order by created_at limit 1", [org.local])).rows[0]?.id,
  pedidos: (await c.query("select array_agg(id) as ids from (select id from pedidos where local_id = $1 order by created_at desc limit 40) x", [org.local])).rows[0].ids ?? [],
  recetas: (await c.query("select array_agg(id) as ids from (select id from recetas where local_id = $1 and tipo = 'plato' order by name limit 5) x", [org.local])).rows[0].ids ?? [],
};

const CASOS = [
  // Borrados: lo que cuesta, sobre todo, comprobar las claves foráneas de las tablas hijas
  { nombre: "Borrar una importación de ventas", sql: "delete from ventas_importes where id = $1", params: [t.imp] },
  { nombre: "Borrar un albarán guardado", sql: "delete from documentos where id = $1", params: [t.documento_id] },
  { nombre: "Guardar un albarán: quitar el evento de precio de una línea (compras.ts)", sql: "delete from precio_eventos where documento_id = $1 and articulo_id = $2", params: [t.documento_id, t.articulo_id] },
  { nombre: "Borrar un artículo", sql: "delete from articulos where id = $1", params: [t.articulo_id] },
  { nombre: "Borrar un proveedor (proveedores/actions.ts)", sql: "delete from proveedores where id = $1 and local_id = $2", params: [t.prov, t.local] },
  { nombre: "Borrar un pedido (demo/seed.ts)", sql: "delete from pedidos where id = $1", params: [t.ped] },
  { nombre: "Eliminar el negocio entero (cuenta/actions.ts, sin RLS)", sql: "delete from organizations where id = $1", params: [t.org], sinRol: true },
  // Lecturas fuera de Hoy, Compras y Escandallos
  { nombre: "Costes de ventas afectadas por un albarán (domain/compras.ts)", params: [t.local, t.saved_at, t.recetas], sql: `select vi.id, vi.filename, vi.desde, vi.hasta, vi.created_at::text as importado, vl.receta_id, count(*)::int as lineas,
      coalesce(sum(vl.unidades), 0) as unidades, coalesce(sum(vl.coste_total), 0) as coste
    from ventas_importes vi join ventas_lineas vl on vl.import_id = vi.id
    where vi.local_id = $1 and vi.created_at > $2 and vl.receta_id = any($3::uuid[])
    group by vi.id, vi.filename, vi.desde, vi.hasta, vi.created_at, vl.receta_id order by vi.created_at` },
  { nombre: "Artículos: lista con último cambio de precio y gasto (articulos/page.tsx)", params: [t.local], sql: `select a.id, a.name, a.unit, a.rend, a.pmp, a.last_price, a.last_purchase_at, a.precio_manual, a.precio_manual_at, a.category_id, a.iva, a.stock, a.stock_min,
        a.consumo_semanal, a.track_stock, a.last_proveedor_id, a.proveedor_pref_id, a.catalog_item_id, a.aliases, a.demo, a.foto_key,
        p.name as proveedor, pe.variacion, pe.fecha as ev_fecha, g.gasto
      from articulos a
      left join proveedores p on p.id = coalesce(a.proveedor_pref_id, a.last_proveedor_id)
      left join lateral (select variacion, fecha from precio_eventos where articulo_id = a.id order by fecha desc, created_at desc limit 1) pe on true
      left join lateral (select sum(cl.importe)::float as gasto from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.articulo_id = a.id and d.fecha >= current_date - 90) g on true
      where a.local_id = $1 and not a.archived order by a.name` },
  { nombre: "Compras: ficha de un albarán, cambio de precio de cada línea (compras/[id]/page.tsx)", params: [t.documento_id], sql: `select cl.idx, cl.texto, cl.articulo_id, a.name, a.unit, cl.cantidad, cl.unidad_compra, cl.factor, cl.precio, cl.descuento, cl.bonificadas, cl.importe, cl.iva, cl.coste_unit,
        pe.variacion, pe.precio_anterior as antes
      from compra_lineas cl join articulos a on a.id = cl.articulo_id
      left join lateral (select variacion, precio_anterior from precio_eventos where documento_id = cl.documento_id and articulo_id = cl.articulo_id limit 1) pe on true
      where cl.documento_id = $1 order by cl.idx` },
  { nombre: "Hoy: contador de importaciones de ventas (queries/hoy.ts)", sql: "select count(*)::int from ventas_importes where local_id = $1", params: [t.local] },
  { nombre: "Hoy: comensales de los últimos meses (queries/hoy.ts)", params: [t.local], sql: `select to_char(date_trunc('month', desde), 'YYYY-MM') as mes, sum(comensales)::float as comensales,
      sum(greatest(1, hasta - desde + 1))::float as dias from ventas_importes where local_id = $1 and comensales is not null and desde >= date_trunc('month', current_date) - interval '5 months' group by 1` },
  { nombre: "Ventas: últimas importaciones (ventas/page.tsx)", params: [t.local], sql: "select id, filename, desde, hasta, filas, total, created_at, demo from ventas_importes where local_id = $1 order by desde desc nulls last, created_at desc limit 12" },
  { nombre: "Pedidos: lista (inventario/pedidos/page.tsx)", params: [t.local], sql: `select pe.id, case when d.status = 'guardado' then 'recibido' when d.status is not null and d.status <> 'descartado' and pe.estado in ('borrador','enviado') then 'facturando' else pe.estado end as estado,
        pe.created_at, pe.enviado_at, coalesce(pe.recibido_at, d.saved_at) as recibido_at, p.name as proveedor, p.phone, p.email, pe.documento_id as factura,
        exists (select 1 from documentos d2 where d2.local_id = pe.local_id and d2.proveedor_id = pe.proveedor_id and d2.status = 'guardado' and d2.saved_at >= pe.created_at) as albaran
      from pedidos pe left join proveedores p on p.id = pe.proveedor_id left join documentos d on d.id = pe.documento_id
      where pe.local_id = $1 order by (pe.estado in ('borrador','enviado') and d.status is distinct from 'guardado') desc, pe.created_at desc limit 40` },
  { nombre: "Pedidos: líneas de los 40 últimos (inventario/pedidos/page.tsx)", params: [t.pedidos], sql: "select pl.pedido_id, a.name, pl.cantidad, pl.unidad, pl.precio_estimado from pedido_lineas pl join articulos a on a.id = pl.articulo_id where pl.pedido_id = any($1::uuid[]) order by a.name" },
  { nombre: "Inventario: pedidos abiertos (inventario/page.tsx)", params: [t.local], sql: `select count(*)::int as n from pedidos pe left join documentos d on d.id = pe.documento_id
      where pe.local_id = $1 and pe.estado in ('borrador','enviado') and d.status is distinct from 'guardado'` },
];

async function ejecutar(caso) {
  await c.query("begin");
  try {
    if (!caso.sinRol) {
      await c.query("set local role restora_app");
      await c.query("select set_config('app.tenant_id', $1, true), set_config('timezone', 'Europe/Madrid', true)", [t.org]);
    }
    const r = await c.query(`explain (analyze, buffers) ${caso.sql}`, caso.params);
    const texto = r.rows.map((x) => x["QUERY PLAN"]).join("\n");
    const triggers = [...texto.matchAll(/Trigger for constraint (\w+)[^:\n]*: time=([\d.]+) calls=(\d+)/g)].map((x) => ({ restriccion: x[1], ms: Number(x[2]), llamadas: Number(x[3]) })).sort((a, b) => b.ms - a.ms);
    return { ms: Number((texto.match(/Execution Time: ([\d.]+) ms/) ?? [])[1]), triggers, seq: [...new Set([...texto.matchAll(/Seq Scan on (\w+)/g)].map((x) => x[1]))], texto };
  } finally { await c.query("rollback").catch(() => {}); }
}
console.log("\nOperaciones (tiempo en ms; «claves» = lo que se va en comprobar claves foráneas de otras tablas; entre paréntesis, la comprobación más lenta):");
console.log("  " + "operación".padEnd(72) + "   total    claves   Seq Scan en el plan");
const informe = [];
for (const caso of CASOS) {
  if (caso.params.some((p) => p === undefined || p === null)) { console.log(`  ${caso.nombre.padEnd(72)}   (sin datos para esta operación en el negocio ${NEGOCIO})`); continue; }
  const medidas = [];
  for (let i = 0; i < REPETICIONES + 1; i++) { const m = await ejecutar(caso); if (i > 0) medidas.push(m); } // la primera vuelta calienta
  const ms = mediana(medidas.map((m) => m.ms));
  const rep = medidas.find((m) => m.ms === ms) ?? medidas[0];
  const claves = rep.triggers.reduce((s, x) => s + x.ms, 0);
  const peor = rep.triggers[0];
  informe.push({ operacion: caso.nombre, ms, claves, peorClave: peor ? { restriccion: peor.restriccion, ms: peor.ms } : null, seq: rep.seq, triggers: rep.triggers.filter((x) => x.ms >= 0.5).slice(0, 6) });
  console.log(`  ${caso.nombre.padEnd(72)} ${f1(ms).padStart(7)}  ${f1(claves).padStart(8)}   ${rep.seq.length ? rep.seq.join(", ") : "—"}${peor && peor.ms >= 1 ? `   (${peor.restriccion} ${f1(peor.ms)})` : ""}`);
}
await c.end();
if (arg("etiqueta", false) || arg("json", false)) {
  const e = arg("etiqueta", false);
  const salida = path.join(AQUI, "out");
  mkdirSync(salida, { recursive: true });
  writeFileSync(path.join(salida, `indices${e && e !== true ? "-" + e : ""}.json`), JSON.stringify({ fecha: new Date().toISOString(), negocio: NEGOCIO, repeticiones: REPETICIONES, clavesSinIndice: sinIndiceFk, tablasSinIndiceDeTenant: sinTenant, operaciones: informe }, null, 1));
  console.log(`\n  guardado en tests/carga/out/indices${e && e !== true ? "-" + e : ""}.json`);
}

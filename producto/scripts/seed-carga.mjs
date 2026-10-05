// Siembra una base de datos APARTE con negocios sintéticos para medir el rendimiento (Task 18 / B7 del plan): cada negocio con su
// catálogo de artículos, proveedores, platos y elaboraciones con sus escandallos, cientos de albaranes con miles de líneas, sus
// movimientos de stock, cambios de precio, y un año de ventas importadas. Los números salen de un generador con semilla fija: dos
// siembras con los mismos parámetros dan los mismos datos.
//
//   node scripts/seed-carga.mjs                    50 negocios en la base restora_carga (se crea y se migra si no existe)
//   node scripts/seed-carga.mjs --negocios 10      menos negocios
//   node scripts/seed-carga.mjs --recrear          borra la base y empieza de cero
//
// Variables: CARGA_DB (nombre de la base, restora_carga), CARGA_ARTICULOS (250), CARGA_PLATOS (90), CARGA_ELABORACIONES (25),
// CARGA_ALBARANES (400, repartidos en 18 meses), CARGA_LINEAS (10 por albarán), CARGA_PEDIDOS (150, con de 4 a 9 líneas: las mismas en todos los
// pedidos de un negocio), CARGA_DIAS_VENTAS (365), CARGA_PROB_VENTA (0,4: probabilidad de que un plato se venda un día). Con los valores por
// defecto, cada negocio tiene unas 4.000 líneas de compra, 4.000 movimientos de stock, 700 líneas de escandallo, hasta 1.350 de pedidos y unas
// 13.000 líneas de venta: unos 26.700 registros por negocio y 1,34 millones con los 50 de por omisión (unos 300 MB). Con CARGA_* más altos se
// siembra un negocio grande (docs/RENDIMIENTO.md).
//
// Solo contra un Postgres local: crea una base de datos y mete cientos de miles de filas. No se ejecuta contra Neon.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
for (const f of [".env.local", ".env"]) {
  if (!existsSync(RAIZ + f)) continue;
  for (const line of readFileSync(RAIZ + f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}
const arg = (n, def) => { const i = process.argv.indexOf("--" + n); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const num = (v, def) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : def; };

const NEGOCIOS = num(arg("negocios", 50), 50);
const V = {
  proveedores: 12, articulos: num(process.env.CARGA_ARTICULOS, 250), platos: num(process.env.CARGA_PLATOS, 90), elaboraciones: num(process.env.CARGA_ELABORACIONES, 25),
  albaranes: num(process.env.CARGA_ALBARANES, 400), lineas: num(process.env.CARGA_LINEAS, 10), pedidos: num(process.env.CARGA_PEDIDOS, 150), diasVentas: num(process.env.CARGA_DIAS_VENTAS, 365), probVenta: num(process.env.CARGA_PROB_VENTA, 0.4),
  mesesCompras: 18,
};
const NOMBRE_DB = process.env.CARGA_DB || "restora_carga";

/** Misma base que DATABASE_URL, con otro nombre. */
function urlDeCarga(nombre = NOMBRE_DB, base = process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev") {
  const u = new URL(base);
  u.pathname = "/" + nombre;
  return u.toString();
}
const base = new URL(process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev");
if (!["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(base.hostname)) {
  console.error(`[seed-carga] DATABASE_URL apunta a ${base.hostname}: esta siembra solo se ejecuta contra un Postgres local (crea una base y mete más de un millón de filas).`);
  process.exit(1);
}
const t0 = Date.now();
const seg = () => ((Date.now() - t0) / 1000).toFixed(1) + " s";

// ───────── La base ─────────
const admin = new pg.Client({ connectionString: urlDeCarga("postgres") });
await admin.connect();
const existe = (await admin.query("select 1 from pg_database where datname = $1", [NOMBRE_DB])).rowCount > 0;
if (existe && arg("recrear", false)) { await admin.query(`drop database "${NOMBRE_DB}" with (force)`); console.log(`· base ${NOMBRE_DB} borrada`); }
if (!existe || arg("recrear", false)) await admin.query(`create database "${NOMBRE_DB}"`);
await admin.end();
const migra = spawnSync(process.execPath, [path.join(RAIZ, "scripts/migrate.mjs")], { cwd: RAIZ, encoding: "utf8", env: { ...process.env, DATABASE_URL: urlDeCarga(), DATABASE_URL_UNPOOLED: urlDeCarga() } });
if (migra.status !== 0) { console.error("[seed-carga] no se pudieron aplicar las migraciones:\n" + migra.stdout + migra.stderr); process.exit(1); }
console.log(`· base ${NOMBRE_DB} lista (${migra.stdout.trim().split("\n").pop()})`);

const c = new pg.Client({ connectionString: urlDeCarga() });
await c.connect();
const ya = (await c.query("select count(*)::int as n from organizations where name like 'Carga %'")).rows[0].n;
if (ya >= NEGOCIOS) {
  console.log(`· ya hay ${ya} negocios sintéticos en ${NOMBRE_DB}: nada que sembrar (usa --recrear para empezar de cero)`);
  await c.end();
  process.exit(0);
}
const cats = (await c.query("select id from catalog_categories order by id")).rows.map((r) => r.id);
const familias = ["Entrantes", "Carnes", "Pescados", "Arroces", "Postres", "Ensaladas", "Bebidas", "Guarniciones"];

// ───────── Un negocio ─────────
async function negocio(n) {
  await c.query("begin");
  try {
    await c.query("select setseed($1)", [((n * 7919) % 1000) / 1000]); // los mismos números cada vez
    const org = (await c.query("insert into organizations (name, onboarding_done_at, trial_ends_at, plan_status, briefing) values ($1, now(), now() + interval '365 days', 'active', $2) returning id",
      [`Carga ${n}`, JSON.stringify({ tipo: "restaurante", objetivo: "margen" })])).rows[0].id;
    await c.query("select set_config('app.tenant_id', $1, true)", [org]); // por si el rol de conexión no salta RLS
    const local = (await c.query("insert into locales (tenant_id, name, ciudad, postal_code, iva_venta, fc_objetivo, comensales_dia) values ($1, $2, 'Madrid', '28001', 10, 30, 120) returning id", [org, `Carga ${n}`])).rows[0].id;
    const email = `carga-${n}@example.invalid`;
    const user = (await c.query("insert into users (email, name, password_hash, email_verified_at) values ($1, $2, 'x', now()) returning id", [email, `Titular ${n}`])).rows[0].id;
    await c.query("insert into memberships (org_id, user_id, role) values ($1, $2, 'propietario')", [org, user]);
    const q = (sql, params) => c.query(sql, params);

    await q("insert into proveedores (tenant_id, local_id, name, origen) select $1, $2, 'Proveedor ' || lpad(g::text, 2, '0'), 'albaran' from generate_series(1, $3::int) g", [org, local, V.proveedores]);
    await q(`insert into articulos (tenant_id, local_id, name, category_id, unit, rend, iva, stock, stock_min, consumo_semanal, track_stock, pmp, last_price, last_proveedor_id, last_purchase_at)
      select $1, $2, 'Artículo ' || lpad(s.g::text, 4, '0'), ($4::text[])[1 + s.g % array_length($4::text[], 1)], (array['kg','L','ud'])[1 + s.g % 3], (60 + floor(random() * 41))::int,
        (array[4,10,10,21])[1 + s.g % 4], round((random() * 80)::numeric, 3), case when random() < 0.6 then round((random() * 40)::numeric, 3) end,
        case when random() < 0.7 then round((random() * 60)::numeric, 3) end, random() < 0.7, s.p, s.p,
        (select id from proveedores where local_id = $2 order by id offset (s.g % $3::int) limit 1), now() - random() * interval '60 days'
      from (select g, round((0.4 + random() * 24)::numeric, 4) as p from generate_series(1, $5::int) g) s`, [org, local, V.proveedores, cats, V.articulos]);
    await q(`insert into recetas (tenant_id, local_id, tipo, name, familia, raciones, rinde, rinde_unit, estado, en_carta)
      select $1, $2, 'elaboracion', 'Elaboración ' || lpad(g::text, 3, '0'), '', 1, (1 + floor(random() * 9))::numeric, 'kg', 'activo', false from generate_series(1, $3::int) g`, [org, local, V.elaboraciones]);
    await q(`insert into recetas (tenant_id, local_id, tipo, name, familia, raciones, rinde, rinde_unit, estado, en_carta, ventas_mes, orden)
      select $1, $2, 'plato', 'Plato ' || lpad(g::text, 3, '0'), ($4::text[])[1 + g % array_length($4::text[], 1)], 1, 1, 'kg', 'activo', random() < 0.92, (5 + floor(random() * 395))::int, g
      from generate_series(1, $3::int) g`, [org, local, V.platos, familias]);
    // (Las subconsultas «order by random() limit 1» llevan una condición que depende de la fila de fuera: sin ella, Postgres las calcula una sola vez y
    // todas las líneas saldrían con el mismo artículo.)
    // Escandallos: cada receta con sus ingredientes (artículos al azar, en la unidad que casa con la del artículo) y algunos platos con una elaboración
    await q(`insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, cantidad, unidad)
      select $1, r.id, s.i, a.id, case a.unit when 'ud' then (1 + floor(random() * 3))::numeric else (30 + floor(random() * 300))::numeric end, case a.unit when 'ud' then 'ud' when 'kg' then 'g' else 'ml' end
      from recetas r
      cross join lateral generate_series(0, (case when r.tipo = 'plato' then 4 + floor(random() * 4) else 2 + floor(random() * 3) end)::int) as s(i)
      cross join lateral (select id, unit from articulos where local_id = $2 and not archived and s.i >= 0 order by random() limit 1) a
      where r.local_id = $2`, [org, local]);
    await q(`insert into receta_lineas (tenant_id, receta_id, idx, subreceta_id, cantidad, unidad)
      select $1, r.id, 20, e.id, (50 + floor(random() * 200))::numeric, 'g'
      from recetas r cross join lateral (select id from recetas where local_id = $2 and tipo = 'elaboracion' and r.id is not null order by random() limit 1) e
      where r.local_id = $2 and r.tipo = 'plato' and random() < 0.3`, [org, local]);
    // Coste de cada receta con los precios de sus artículos (sin contar las elaboraciones) y un PVP que dé food costs repartidos alrededor del objetivo
    await q(`update recetas r set coste_cache = round(x.c::numeric, 6) from (
        select rl.receta_id, sum(case rl.unidad when 'g' then rl.cantidad / 1000 when 'ml' then rl.cantidad / 1000 else rl.cantidad end * coalesce(a.pmp, a.last_price, 0) / (a.rend / 100.0)) as c
        from receta_lineas rl join articulos a on a.id = rl.articulo_id where rl.tenant_id = $1 group by rl.receta_id) x where r.id = x.receta_id`, [org]);
    await q("update recetas set pvp = round((coalesce(nullif(coste_cache, 0), 3) * 1.1 / (0.2 + random() * 0.3))::numeric, 1) where local_id = $1 and tipo = 'plato'", [local]);

    // Compras: albaranes guardados repartidos en 18 meses, con sus líneas, su stock y sus cambios de precio
    await q(`insert into documentos (tenant_id, local_id, kind, status, source, proveedor_id, numero, fecha, ocr_model, saved_at, created_at, pages)
      select $1, $2, case when random() < 0.9 then 'albaran' else 'factura' end, 'guardado', 'ocr', (select id from proveedores where local_id = $2 order by id offset (g % $3::int) limit 1),
        'A-' || lpad(g::text, 5, '0'), (current_date - (($5::int * 30) * (g - 1) / $4::int)), 'claude-sonnet-5-5',
        (current_date - (($5::int * 30) * (g - 1) / $4::int))::timestamp + time '12:00', (current_date - (($5::int * 30) * (g - 1) / $4::int))::timestamp + time '11:00', 1
      from generate_series(1, $4::int) g`, [org, local, V.proveedores, V.albaranes, V.mesesCompras]);
    await q(`insert into compra_lineas (tenant_id, documento_id, idx, texto, articulo_id, cantidad, unidad_compra, factor, precio, descuento, bonificadas, importe, iva, coste_unit)
      select $1, d.id, s.i, 'Línea ' || s.i, a.id, k.cant, a.unit, 1, k.precio, 0, 0, round(k.cant * k.precio, 4), a.iva, k.precio
      from documentos d
      cross join lateral generate_series(0, $3::int - 1) s(i)
      cross join lateral (select id, unit, iva, coalesce(last_price, 5) as base from articulos where local_id = $2 and not archived and s.i >= 0 order by random() limit 1) a
      cross join lateral (select (1 + floor(random() * 30))::numeric as cant, round((a.base * (0.9 + random() * 0.2))::numeric, 6) as precio) k
      where d.tenant_id = $1`, [org, local, V.lineas]);
    await q(`update documentos d set base = x.b, cuota = round(x.c, 2), total = round(x.b + x.c, 2) from (
        select documento_id, round(sum(importe), 2) as b, sum(importe * iva / 100.0) as c from compra_lineas where tenant_id = $1 group by 1) x where d.id = x.documento_id`, [org]);
    await q(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, ref_id, fecha)
      select cl.tenant_id, $2, cl.articulo_id, 'compra', cl.cantidad * cl.factor, cl.coste_unit, 'documento', cl.documento_id, (d.fecha + time '12:00') at time zone 'UTC'
      from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.tenant_id = $1`, [org, local]);
    await q(`insert into precio_eventos (tenant_id, articulo_id, proveedor_id, documento_id, precio_anterior, precio_nuevo, variacion, fecha)
      select $1, x.articulo_id, x.proveedor_id, x.documento_id, x.ant, x.nuevo, round(((x.nuevo - x.ant) / x.ant)::numeric, 5), x.fecha
      from (select cl.articulo_id, d.proveedor_id, d.id as documento_id, d.fecha, cl.coste_unit as nuevo, cl.coste_unit * (0.8 + random() * 0.35) as ant
            from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.tenant_id = $1 and random() < 0.12) x where abs((x.nuevo - x.ant) / x.ant) >= 0.005`, [org]);
    await q(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, origen)
      select distinct on (cl.articulo_id, d.proveedor_id) cl.tenant_id, cl.articulo_id, d.proveedor_id, cl.unidad_compra, 1, cl.precio, cl.coste_unit, d.fecha, 'albaran'
      from compra_lineas cl join documentos d on d.id = cl.documento_id where cl.tenant_id = $1 order by cl.articulo_id, d.proveedor_id, d.fecha desc`, [org]);
    await q(`insert into avisos_estado (evento_id, tenant_id, estado, user_id) select id, $1, 'resuelto', $2 from precio_eventos where tenant_id = $1 and fecha >= current_date - 30 order by fecha desc limit 8`, [org, user]);
    // Pedidos a proveedores: uno cada pocos días durante 18 meses (los dos últimos sin recibir) con sus líneas
    await q(`insert into pedidos (tenant_id, local_id, proveedor_id, estado, created_at, enviado_at, recibido_at)
      select $1, $2, (select id from proveedores where local_id = $2 order by id offset (g % $3::int) limit 1),
        case when g = 1 then 'borrador' when g = 2 then 'enviado' else 'recibido' end, x.ts, x.ts + interval '1 hour', case when g > 2 then x.ts + interval '1 day' end
      from (select g, (current_date - (($5::int * 30) * (g - 1) / $4::int))::timestamp + time '09:00' as ts from generate_series(1, $4::int) g) x`, [org, local, V.proveedores, V.pedidos, V.mesesCompras]);
    await q(`insert into pedido_lineas (tenant_id, pedido_id, articulo_id, cantidad, unidad, precio_estimado)
      select $1, p.id, a.id, (1 + floor(random() * 20))::numeric, a.unit, a.base
      from pedidos p
      cross join lateral generate_series(1, (4 + floor(random() * 6))::int) s(i)
      cross join lateral (select id, unit, coalesce(last_price, 5) as base from articulos where local_id = $2 and not archived and s.i >= 0 order by random() limit 1) a
      where p.tenant_id = $1`, [org, local]);
    await q(`insert into audit_log (tenant_id, user_id, action, entity, entity_id, data, created_at) select $1, $2, 'guardar', 'documento', id::text, '{}'::jsonb, saved_at from documentos where tenant_id = $1`, [org, user]);

    // Ventas: una importación por mes, con una línea por plato y día en que se vendió
    await q(`insert into ventas_importes (tenant_id, local_id, fuente, filename, desde, hasta, filas, total)
      select $1, $2, 'csv', 'ventas-' || to_char(m, 'YYYY-MM') || '.csv', m::date, (m + interval '1 month' - interval '1 day')::date, 0, 0
      from generate_series(date_trunc('month', current_date - $3::int), date_trunc('month', current_date), interval '1 month') m`, [org, local, V.diasVentas]);
    await q(`insert into ventas_lineas (tenant_id, local_id, import_id, fecha, nombre, receta_id, unidades, importe, neto, coste_unit, coste_total)
      select $1, $2, vi.id, dia::date, r.name, r.id, u.n, round(u.n * r.pvp, 2), round(u.n * r.pvp / 1.10, 4), coalesce(r.coste_cache, 0), round(u.n * coalesce(r.coste_cache, 0), 4)
      from generate_series((current_date - $3::int)::timestamp, (current_date - 1)::timestamp, interval '1 day') dia
      cross join (select id, name, pvp, coste_cache from recetas where local_id = $2 and tipo = 'plato' and pvp is not null) r
      join ventas_importes vi on vi.local_id = $2 and dia::date between vi.desde and vi.hasta
      cross join lateral (select (1 + floor(random() * 12))::numeric as n) u
      where random() < $4::float`, [org, local, V.diasVentas, V.probVenta]);
    await q(`update ventas_importes vi set filas = x.n, total = x.t from (select import_id, count(*)::int as n, round(sum(importe), 2) as t from ventas_lineas where tenant_id = $1 group by 1) x where vi.id = x.import_id`, [org]);
    await c.query("commit");
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  }
}

console.log(`· sembrando ${NEGOCIOS - ya} negocios (${V.articulos} artículos, ${V.platos} platos, ${V.albaranes} albaranes de ${V.lineas} líneas, ${V.pedidos} pedidos y ${V.diasVentas} días de ventas cada uno)…`);
for (let n = ya + 1; n <= NEGOCIOS; n++) {
  await negocio(n);
  if (n % 5 === 0 || n === NEGOCIOS) console.log(`  ${n} de ${NEGOCIOS} negocios (${seg()})`);
}
console.log("· actualizando estadísticas (vacuum analyze)…");
await c.query("vacuum analyze");
const filas = (await c.query(`select relname as tabla, n_live_tup::bigint as filas from pg_stat_user_tables where schemaname = 'public' and n_live_tup > 0 order by n_live_tup desc limit 12`)).rows;
const [{ tam }] = (await c.query("select pg_size_pretty(pg_database_size(current_database())) as tam")).rows;
console.log(`· ${NEGOCIOS} negocios en ${NOMBRE_DB}: ${tam}, ${seg()}`);
for (const f of filas) console.log(`  ${String(f.tabla).padEnd(22)} ${Number(f.filas).toLocaleString("es-ES")}`);
await c.end();

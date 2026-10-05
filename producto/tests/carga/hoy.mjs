// Rendimiento con negocios sintéticos (Task 18 / B7 del plan): cuánto tardan las consultas de Hoy, Compras y Escandallos con 50 negocios
// en la misma base de datos, uno o muchos a la vez, y qué dice EXPLAIN (ANALYZE, BUFFERS) de las que más pesan.
//
//   node scripts/seed-carga.mjs                         una vez: crea y rellena la base restora_carga (más de un millón de filas)
//   node --no-warnings tests/carga/hoy.mjs              mide con el pool de la app (5 conexiones) y 1, 5 y 10 personas a la vez
//   node --no-warnings tests/carga/hoy.mjs --explain    además, EXPLAIN (ANALYZE, BUFFERS) de las consultas más pesadas (planes en tests/carga/out/planes.txt)
//   node --no-warnings tests/carga/indices.mjs          qué índices faltan: claves foráneas sin índice y operaciones (borrados, listas) con su coste
//
// Además de los tiempos, imprime cuántas sentencias manda cada pantalla (y cuántas son solo el marco de la transacción), una estimación del tiempo
// con la latencia de red de una base remota y qué tablas se han recorrido enteras. Resultados y planes, en docs/RENDIMIENTO.md.
//
// Opciones: --concurrencia 1,5,10  --pool 5  --rondas 6  --paginas hoy,compras,escandallos  --mezcla  --explain  --consultas 14  --json  --etiqueta antes  --negocio 51  --tipicos 200  --sin 51
// (la etiqueta se añade al nombre de los archivos de tests/carga/out/, para guardar mediciones de antes y de después de un cambio).
// Variable: CARGA_DATABASE_URL (por omisión, DATABASE_URL con la base restora_carga).
//
// Qué se mide: lo que cada pantalla le pide a la base de datos, con el código de la app: Hoy → hoyData(), Escandallos → dishStats() + histVentas(),
// y el marco que llevan todas (loadLocal() y navBadges()). Lo que la app lleva dentro de funciones que no se pueden llamar desde fuera de Next
// (las consultas de Compras y las de la sesión de cada petición) va copiado tal cual en tests/carga/consultas-*.mjs, vigilado por una prueba
// unitaria. Todo pasa por withTenant() (rol restora_app, RLS) o sys() (tablas globales), como en la app.
// Cada medida es el tiempo de pared de la pantalla entera en el servidor (consultas más el cálculo en JavaScript), con el tiempo de las
// consultas y el de espera de una conexión del pool por separado. Con «concurrencia» N, N personas de N negocios distintos piden pantallas a la vez.
// Es la base local, sin latencia de red: ver las notas de docs/RENDIMIENTO.md para pasarlo a Neon.
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { performance } from "node:perf_hooks";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const RAIZ = path.join(AQUI, "../..");
const arg = (n, def) => { const i = process.argv.indexOf("--" + n); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true); };
const lista = (v) => String(v).split(",").map((x) => x.trim()).filter(Boolean);

const base = new URL(process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev");
const URL_CARGA = process.env.CARGA_DATABASE_URL || (() => { const u = new URL(base); u.pathname = "/" + (process.env.CARGA_DB || "restora_carga"); return u.toString(); })();
if (!["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(new URL(URL_CARGA).hostname) && process.env.CARGA_PERMITIR_REMOTA !== "1") {
  console.error("[carga] la base no es local: esta medida es de carga (decenas de consultas por segundo). Si es una base de pruebas tuya, CARGA_PERMITIR_REMOTA=1.");
  process.exit(1);
}
process.env.DATABASE_URL = URL_CARGA; // la app lee esta variable
process.env.PG_POOL_MAX = String(arg("pool", process.env.PG_POOL_MAX || 5));
process.env.TZ = process.env.TZ || "Europe/Madrid";

// ───────── La app, sin compilar ─────────
register(pathToFileURL(path.join(AQUI, "ts-hooks.mjs")));
const src = (f) => pathToFileURL(path.join(RAIZ, "src", f)).href;
const { pool, withTenant, all, one, sys } = await import(src("server/db.ts"));
const { hoyData } = await import(src("server/queries/hoy.ts"));
const { navBadges } = await import(src("server/queries/badges.ts"));
const { loadLocal } = await import(src("server/ctx.ts"));
const { dishStats } = await import(src("server/domain/carta.ts"));
const { histVentas } = await import(src("server/queries/historico.ts"));
const { comprasContenido } = await import("./consultas-compras.mjs");
const { marcoDePeticion } = await import("./consultas-marco.mjs");

// ───────── Medición de cada consulta ─────────
const als = new AsyncLocalStorage();
const p = pool();
const connect0 = p.connect.bind(p);
p.connect = async (...a) => {
  const t0 = performance.now();
  const client = await connect0(...a);
  const reg = als.getStore();
  if (reg) reg.espera += performance.now() - t0;
  if (!client.__medido) {
    client.__medido = true;
    const q0 = client.query.bind(client);
    client.query = (...args) => {
      const r = als.getStore();
      if (!r) return q0(...args);
      const t1 = performance.now();
      const sql = typeof args[0] === "string" ? args[0] : args[0].text, params = typeof args[0] === "string" ? args[1] : args[0].values;
      const fin = (extra = {}) => r.stmts.push({ sql, params, ms: performance.now() - t1, ...extra });
      const res = q0(...args);
      return res && typeof res.then === "function" ? res.then((x) => { fin(); return x; }, (e) => { fin({ error: e.message }); throw e; }) : res;
    };
  }
  return client;
};

// ───────── Contadores de lecturas secuenciales (qué tablas se recorren enteras) ─────────
const SEQ_SQL = "select relname, seq_scan::bigint as veces, seq_tup_read::bigint as filas, n_live_tup::bigint as vivas from pg_stat_user_tables where schemaname = 'public'";
const leerSeq = async (cl) => new Map((await cl.query(SEQ_SQL)).rows.map((r) => [r.relname, { veces: Number(r.veces), filas: Number(r.filas), vivas: Number(r.vivas) }]));
const cStats = new pg.Client({ connectionString: URL_CARGA });
await cStats.connect();
const seqAntes = await leerSeq(cStats);

// ───────── Los negocios ─────────
const c0 = new pg.Client({ connectionString: URL_CARGA });
await c0.connect();
const negocios = (await c0.query("select o.id, o.name, (select user_id from memberships where org_id = o.id limit 1) as user_id from organizations o where o.name like 'Carga %' order by (regexp_replace(o.name, '\\D', '', 'g'))::int")).rows;
await c0.end();
if (!negocios.length) { console.error("[carga] la base no tiene negocios sintéticos: ejecuta antes `node scripts/seed-carga.mjs`"); process.exit(1); }
// Por omisión, los negocios normales del 1 al 50 (--tipicos 200 para usar más, si se han sembrado). El negocio grande que se siembra aparte (el 51: ver
// docs/RENDIMIENTO.md) no entra en la mezcla: se mide con --negocio 51, que hace todas las medidas con ese; --sin 51,60 deja fuera otros.
const solo = arg("negocio", false) === true ? null : arg("negocio", false);
const numero = (o) => Number(o.name.replace(/\D/g, ""));
const tipicos = Number(arg("tipicos", 50)), sin = lista(arg("sin", "51")).map(Number);
const elegidos = solo ? negocios.filter((o) => o.name === `Carga ${solo}`) : negocios.filter((o) => numero(o) <= tipicos && !sin.includes(numero(o)));
if (!elegidos.length) { console.error(`[carga] no hay un negocio «Carga ${solo}»`); process.exit(1); }
const tenants = [];
for (const o of elegidos) tenants.push({ nombre: o.name, ctx: { tenantId: o.id, userId: o.user_id, role: "propietario", local: await loadLocal(o.id) } });

// ───────── Las pantallas ─────────
// Lo que lleva cada petición de la app antes del contenido de la pantalla: la sesión y el negocio del usuario (requireApp(): getSession() y getOrg()),
// el local (getAppCtx()) y los contadores del menú (navBadges()).
const marco = async (ctx) => { await marcoDePeticion(ctx, { sys, one }); await loadLocal(ctx.tenantId); await navBadges(ctx); };
const PAGINAS = {
  hoy: async (ctx) => { await marco(ctx); await hoyData(ctx); await sys((c) => one(c, "select (select count(*)::int from memberships where org_id = $1) as m, (select count(*)::int from invitations where org_id = $1 and accepted_at is null and expires_at > now()) as i", [ctx.tenantId])); },
  compras: async (ctx) => { await marco(ctx); await comprasContenido(ctx, { withTenant, all, one }); },
  escandallos: async (ctx) => { await marco(ctx); await withTenant(ctx.tenantId, async (c) => ({ ...(await dishStats(c, ctx.local)), hist: await histVentas(c, ctx.local.id) })); },
};
const NOMBRES = { hoy: "Hoy", compras: "Compras", escandallos: "Escandallos" };

// Lo que withTenant() y sys() mandan antes y después de la consulta de verdad: cada una es un viaje a la base de datos
const MARCO = /^\s*(begin|commit|rollback|set local role|select set_config)/i;
async function medir(pagina, t) {
  const reg = { stmts: [], espera: 0 };
  const t0 = performance.now();
  await als.run(reg, () => PAGINAS[pagina](t.ctx));
  const ms = performance.now() - t0;
  return { pagina, negocio: t.nombre, ms, db: reg.stmts.reduce((s, x) => s + x.ms, 0), espera: reg.espera, n: reg.stmts.length, marco: reg.stmts.filter((x) => MARCO.test(x.sql)).length, stmts: reg.stmts };
}
const pct = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : NaN; };
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : "—");

async function escenario(paginas, concurrencia, rondas) {
  const medidas = [];
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrencia }, (_, w) => (async () => {
    for (let r = 0; r < rondas; r++) {
      const t = tenants[(w * 7 + r * 13 + 1) % tenants.length]; // cada persona, un negocio distinto, y cada ronda otro
      for (const pg_ of paginas) medidas.push(await medir(pg_, t));
    }
  })()));
  return { medidas, segundos: (performance.now() - t0) / 1000 };
}

// ───────── Ejecución ─────────
const paginas = lista(arg("paginas", "hoy,compras,escandallos")).filter((x) => PAGINAS[x]);
const niveles = lista(arg("concurrencia", "1,5,10")).map(Number).filter((n) => n > 0);
const rondas = Number(arg("rondas", 6));
const resultados = [];
const linea = (e) => `${e.pagina.padEnd(13)} ${String(e.concurrencia).padStart(4)}  ${String(e.ejecuciones).padStart(5)}  ${f1(e.p50).padStart(8)} ${f1(e.p95).padStart(8)} ${f1(e.max).padStart(8)}   ${f1(e.dbP50).padStart(8)} ${f1(e.esperaP50).padStart(8)}   ${String(e.sentencias).padStart(4)}   ${f1(e.porSegundo).padStart(6)}`;
console.log(`Base ${new URL(URL_CARGA).pathname.slice(1)} · ${tenants.length === 1 ? "el negocio «" + tenants[0].nombre + "»" : tenants.length + " negocios"} · pool de ${process.env.PG_POOL_MAX} conexiones · ${rondas} rondas por persona\n`);
console.log("Pantalla       pers.  medidas   p50 ms   p95 ms   máx ms    BD p50 espera p50  sent.  pant/s");

// Calentamiento: conexiones, planes y JIT de JavaScript fuera de la medida
for (let i = 0; i < 3; i++) for (const pg_ of paginas) await medir(pg_, tenants[i % tenants.length]);
let capturaSerie = null;
for (const conc of niveles) {
  const grupos = arg("mezcla", false) ? [{ nombre: "mezcla", paginas }] : paginas.map((x) => ({ nombre: x, paginas: [x] }));
  for (const g of grupos) {
    const { medidas, segundos } = await escenario(g.paginas, conc, rondas);
    if (conc === niveles[0] && !capturaSerie) capturaSerie = [];
    if (conc === niveles[0]) capturaSerie.push(...medidas);
    for (const pg_ of g.paginas) {
      const m = medidas.filter((x) => x.pagina === pg_);
      const e = { pagina: g.nombre === "mezcla" ? `mezcla/${pg_}` : NOMBRES[pg_], concurrencia: conc, ejecuciones: m.length, p50: pct(m.map((x) => x.ms), 0.5), p95: pct(m.map((x) => x.ms), 0.95), max: Math.max(...m.map((x) => x.ms)),
        dbP50: pct(m.map((x) => x.db), 0.5), esperaP50: pct(m.map((x) => x.espera), 0.5), sentencias: Math.round(pct(m.map((x) => x.n), 0.5)), marco: Math.round(pct(m.map((x) => x.marco), 0.5)), porSegundo: m.length / segundos };
      resultados.push(e);
      console.log(linea(e));
    }
  }
}

// ───────── Qué consultas pesan más (con una sola persona) ─────────
const etiqueta = (sql) => sql.replace(/\s+/g, " ").trim();
const porSql = new Map();
for (const m of capturaSerie ?? []) for (const s of m.stmts) {
  const k = etiqueta(s.sql);
  const e = porSql.get(k) ?? { sql: k, veces: 0, ms: [], ejemplo: s, paginas: new Set() };
  e.veces++; e.ms.push(s.ms); e.paginas.add(m.pagina);
  if (s.ms > e.ejemplo.ms) e.ejemplo = s;
  porSql.set(k, e);
}
const top = [...porSql.values()].map((e) => ({ ...e, total: e.ms.reduce((a, b) => a + b, 0), p50: pct(e.ms, 0.5), p95: pct(e.ms, 0.95) })).sort((a, b) => b.total - a.total);
const totalBd = top.reduce((s, e) => s + e.total, 0);
console.log(`\nConsultas que más tiempo suman con ${niveles[0]} ${niveles[0] === 1 ? "persona" : "personas"} (${top.length} distintas, ${f1(totalBd)} ms en total):`);
console.log("  % del total   veces   p50 ms   p95 ms   pantallas              consulta");
for (const e of top.slice(0, Number(arg("consultas", 14)))) console.log(`  ${(100 * e.total / totalBd).toFixed(1).padStart(10)}   ${String(e.veces).padStart(5)}  ${f1(e.p50).padStart(7)}  ${f1(e.p95).padStart(7)}   ${[...e.paginas].join("+").padEnd(22)} ${e.sql.slice(0, 90)}`);

// ───────── Viajes a la base de datos por pantalla (con una persona) ─────────
// En esta máquina la base de datos está al lado: cada sentencia cuesta microsegundos de red. En Neon cuesta lo que tarde el viaje de ida y
// vuelta, así que el p50 de la pantalla sube aproximadamente «sentencias × latencia». Es una estimación, no una medida.
const ETIQUETA = arg("etiqueta", "") === true ? "" : String(arg("etiqueta", ""));
const sufijo = ETIQUETA ? "-" + ETIQUETA : "";
const unaPersona = resultados.filter((e) => e.concurrencia === niveles[0] && !e.pagina.startsWith("mezcla/"));
if (unaPersona.length) {
  console.log(`\nViajes a la base de datos por pantalla (${niveles[0]} ${niveles[0] === 1 ? "persona" : "personas"}) y p50 estimado según la latencia de red a la base (local + sentencias × latencia):`);
  console.log("Pantalla       sentencias  de ellas de marco   local     +1 ms     +3 ms     +5 ms    +10 ms");
  for (const e of unaPersona) console.log(`${e.pagina.padEnd(13)} ${String(e.sentencias).padStart(10)}  ${String(e.marco).padStart(16)}  ${[0, 1, 3, 5, 10].map((rtt) => f1(e.p50 + e.sentencias * rtt).padStart(8)).join("  ")}`);
}

// ───────── Qué tablas se han recorrido enteras ─────────
await p.end(); // al cerrar sus conexiones, Postgres vuelca los contadores de cada una
await new Promise((r) => setTimeout(r, 300));
const seqDespues = await leerSeq(cStats);
await cStats.end();
const secuenciales = [...seqDespues].map(([tabla, d]) => ({ tabla, veces: d.veces - (seqAntes.get(tabla)?.veces ?? 0), filas: d.filas - (seqAntes.get(tabla)?.filas ?? 0), vivas: d.vivas })).filter((x) => x.veces > 0).sort((a, b) => b.filas - a.filas);
console.log(`\nTablas recorridas enteras (Seq Scan) durante toda la ejecución, calentamiento incluido (${secuenciales.length ? "veces · filas leídas · filas de la tabla" : "ninguna"}):`);
for (const x of secuenciales.slice(0, 8)) console.log(`  ${x.tabla.padEnd(22)} ${String(x.veces).padStart(6)} · ${String(x.filas).padStart(10)} · ${String(x.vivas).padStart(9)}`);

// ───────── EXPLAIN (ANALYZE, BUFFERS) de las más pesadas ─────────
const salida = path.join(AQUI, "out");
mkdirSync(salida, { recursive: true });
if (arg("explain", false)) {
  const cx = new pg.Client({ connectionString: URL_CARGA });
  await cx.connect();
  const planes = [];
  const candidatos = top.filter((e) => !/^(begin|commit|set local role|select set_config)/i.test(e.sql)).slice(0, Number(arg("planes", 14)));
  console.log(`\nEXPLAIN (ANALYZE, BUFFERS) de las ${candidatos.length} consultas más pesadas, con los parámetros de un negocio real:`);
  for (const e of candidatos) {
    const t = tenants.find((x) => x.ctx.tenantId === e.ejemplo.params?.[0]) ?? tenants.find((x) => JSON.stringify(e.ejemplo.params ?? []).includes(x.ctx.local.id)) ?? tenants[0];
    // Con el rol de la app, como withTenant(); si la consulta es de tablas globales (la sesión, el negocio del usuario), el rol no tiene permiso y se
    // explica sin rol, como sys()
    const explicar = async (conRol) => {
      await cx.query("begin");
      if (conRol) {
        await cx.query("set local role restora_app");
        await cx.query("select set_config('app.tenant_id', $1, true), set_config('timezone', 'Europe/Madrid', true)", [t.ctx.tenantId]);
      }
      return cx.query(`explain (analyze, buffers, settings) ${e.ejemplo.sql}`, e.ejemplo.params ?? []);
    };
    try {
      const r = await explicar(true).catch(async (err) => { await cx.query("rollback").catch(() => {}); if (err.code === "42501") return explicar(false); throw err; });
      const texto = r.rows.map((x) => x["QUERY PLAN"]).join("\n");
      const ejec = Number((texto.match(/Execution Time: ([\d.]+) ms/) ?? [])[1]), plan = Number((texto.match(/Planning Time: ([\d.]+) ms/) ?? [])[1]);
      const seqTablas = [...new Set([...texto.matchAll(/Seq Scan on (\w+)/g)].map((x) => x[1]))];
      const filas = [...texto.matchAll(/Rows Removed by (?:Filter|Index Recheck): (\d+)/g)].reduce((s, x) => s + Number(x[1]), 0);
      const bufs = texto.match(/Buffers: shared hit=(\d+)(?: read=(\d+))?/);
      planes.push({ sql: e.sql, ejec, plan, seqTablas, filas, hit: Number(bufs?.[1] ?? 0), read: Number(bufs?.[2] ?? 0), texto, negocio: t.nombre });
      console.log(`  ${f1(ejec).padStart(8)} ms (plan ${f1(plan)})  filas descartadas ${String(filas).padStart(8)}  buffers hit=${bufs?.[1] ?? 0} read=${bufs?.[2] ?? 0}  ${seqTablas.length ? "Seq Scan: " + seqTablas.join(", ") : "sin Seq Scan"}  ${e.sql.slice(0, 70)}`);
    } catch (err) {
      console.log(`  (no se pudo explicar: ${err.message.split("\n")[0]})  ${e.sql.slice(0, 70)}`);
    } finally { await cx.query("rollback").catch(() => {}); }
  }
  await cx.end();
  writeFileSync(path.join(salida, `planes${sufijo}.txt`), planes.map((x, i) => `### ${i + 1}. ${x.negocio} · ejecución ${f1(x.ejec)} ms · planificación ${f1(x.plan)} ms\n${x.sql}\n\n${x.texto}\n`).join("\n\n"));
  console.log(`  planes completos en tests/carga/out/planes${sufijo}.txt`);
}
if (arg("json", false)) {
  writeFileSync(path.join(salida, `resultados${sufijo}.json`), JSON.stringify({ fecha: new Date().toISOString(), negocios: tenants.length, pool: process.env.PG_POOL_MAX, rondas, resultados, secuenciales: secuenciales.slice(0, 12), consultas: top.slice(0, 30).map(({ sql, veces, p50, p95, total }) => ({ sql, veces, p50, p95, total })) }, null, 1));
  console.log(`  resultados en tests/carga/out/resultados${sufijo}.json`);
}

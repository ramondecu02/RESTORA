// Auditoría automática del aislamiento entre negocios (Task 12 / B1 del plan).
//
//   node scripts/audit-tenancy.mjs            informe en texto; código de salida ≠ 0 si algo del aislamiento falla
//   node scripts/audit-tenancy.mjs --json     el mismo resultado en JSON
//   node scripts/audit-tenancy.mjs --src ruta carpeta de código que se escanea en busca de sys() (por defecto, src/)
//
// Qué comprueba (todo contra la base de datos de DATABASE_URL_UNPOOLED o DATABASE_URL, como migrate.mjs):
//  1. Toda tabla con tenant_id tiene la seguridad por filas (RLS) activada Y forzada, y políticas que filtran por
//     app.tenant_id en las cuatro operaciones (leer, crear, cambiar, borrar). Una política permisiva que no filtre por
//     negocio (por ejemplo «using (true)») también falla: las políticas permisivas se suman y abriría todas las filas.
//  2. Toda tabla SIN tenant_id está en la lista GLOBALES con su motivo. Una tabla nueva sin tenant_id y sin motivo falla:
//     o es de negocio (hay que darle tenant_id y RLS) o hay que justificar aquí por qué es global.
//  3. El rol restora_app (con el que se ejecuta cada transacción de negocio) no es superusuario ni salta RLS, la conexión
//     puede cambiar a él, y no puede tocar las tablas globales sensibles (cuentas, sesiones, códigos, pagos…).
//  4. Ninguna vista salta RLS (sin security_invoker) ni hay vistas materializadas o funciones SECURITY DEFINER sobre tablas
//     de negocio: todas se ejecutarían con los permisos de su propietario.
//  5. Clasifica los usos de sys() del código (consultas fuera de withTenant): «solo tablas globales», «filtrado por la
//     sesión», «por credencial» u «otros». Una consulta de sys() que toque una tabla de negocio falla: toda consulta de
//     negocio va dentro de withTenant().
//
// Se ejecuta en `npm run build` justo después de las migraciones: si falta algo, el despliegue falla antes de publicar.
// Salida de emergencia (deliberada y ruidosa): SKIP_TENANCY_AUDIT=1.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import ts from "typescript";

const AQUI = fileURLToPath(new URL("..", import.meta.url));
export const ROL_APP = "restora_app";

/**
 * Tablas SIN tenant_id y por qué lo son. `app` dice qué puede hacer el rol de la app (restora_app) con ellas:
 *  - "ninguno": nada (se comprueba: sin SELECT/INSERT/UPDATE/DELETE ni por columnas);
 *  - { solo: [columnas] }: leer únicamente esas columnas;
 *  - "catalogo" / "capa": lectura (y, la capa anónima, escritura) por diseño; no se comprueba nada más.
 */
export const GLOBALES = {
  users: { motivo: "cuentas de acceso: personas, no negocios; se vinculan a un negocio por memberships", app: { solo: ["id", "name"] } },
  organizations: { motivo: "es el propio negocio: su id es el tenant_id de todo lo demás", app: "ninguno" },
  memberships: { motivo: "vínculo persona–negocio (org_id); decide a qué negocio entra cada sesión", app: "ninguno" },
  sessions: { motivo: "sesiones de acceso (hash del token), antes de saber a qué negocio pertenece la petición", app: "ninguno" },
  email_codes: { motivo: "códigos de verificación y de restablecer contraseña (hash), de la persona, no del negocio", app: "ninguno" },
  invitations: { motivo: "invitaciones por token (org_id): se leen con el token antes de que exista sesión en ese negocio", app: "ninguno" },
  rate_limits: { motivo: "contadores de límite por clave (IP, persona, negocio): sin datos de negocio", app: "ninguno" },
  outbox_emails: { motivo: "registro de correos enviados (destinatario, asunto, estado); el cuerpo solo se guarda en el buzón de pruebas", app: "ninguno" },
  stripe_events: { motivo: "ids de eventos de Stripe ya aplicados (idempotencia del webhook)", app: "ninguno" },
  schema_migrations: { motivo: "versiones de migración aplicadas", app: "ninguno" },
  catalog_categories: { motivo: "catálogo base del sector, compartido y sin datos de clientes", app: "catalogo" },
  catalog_items: { motivo: "catálogo base del sector, compartido y sin datos de clientes", app: "catalogo" },
  bench_price_obs: { motivo: "capa anónima de precios: sin tenant_id a propósito (k-anonimato; el contribuyente es un HMAC no reversible)", app: "capa" },
};

// Tablas «solo globales» para clasificar sys(): sin filas por persona ni por negocio
const SOLO_GLOBALES = new Set(["catalog_categories", "catalog_items", "rate_limits", "stripe_events", "outbox_emails", "schema_migrations", "bench_price_obs"]);
// Tablas con filas por cuenta o por negocio, pero sin tenant_id: sys() las toca filtradas por la sesión o por una credencial
const DE_CUENTA = new Set(["users", "organizations", "memberships", "sessions", "invitations", "email_codes"]);
// De dónde sale, en el código, un identificador que viene de la sesión (nunca del cuerpo de la petición): directo (ctx.*, s.*) o, más débil,
// como parámetro de una función cuyos llamadores lo sacan de la sesión (se comprueban a mano en la revisión de DECISIONES.md)
const SESION_DIRECTA = /\b(ctx\.(tenantId|userId|sessionId)|s\.(userId|sessionId|orgId)|org\.id)\b/;
const SESION_POR_PARAMETRO = /\b(orgId|userId|sessionId|row\.id)\b/;
// Consultas que identifican por una credencial o un dato público antes de que haya sesión: contraseña, token, código, evento firmado, alta de cuenta
const POR_CREDENCIAL = /token_hash|lower\((u\.)?email\)\s*=|\bemail\s*=\s*\$|email_codes|\bwhere\s+stripe_customer_id\s*=|stripe_events|insert\s+into\s+(users|organizations)\b/i;
// Valores que salen de una invitación ya validada con su token (findInvitation): el negocio y el rol vienen del token, no de la petición
const DE_INVITACION = /\binv\.(org_id|id|email|role)\b/;

// ───────────────────────── Entorno y conexión (como migrate.mjs) ─────────────────────────
export function cargarEntorno(dir = AQUI) {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(dir + f)) continue;
    for (const line of readFileSync(dir + f, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
}
export const urlDeBase = (env = process.env) => {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  // Igual que pgUrl() en src/server/db.ts y que migrate.mjs: verify-full es lo que pg ya aplica con sslmode=require, sin el aviso
  return url ? (/[?&]uselibpqcompat=/.test(url) ? url : url.replace(/([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/, "$1verify-full")) : null;
};

// ───────────────────────── 1–4: la base de datos ─────────────────────────
const TENANT_EN_EXPR = (e) => !!e && /\btenant_id\b/.test(e) && /current_setting\('app\.tenant_id'/.test(e);
const OPS = [["select", "leer"], ["insert", "crear"], ["update", "cambiar"], ["delete", "borrar"]];
const ENTRE = { select: ["*", "r"], insert: ["*", "a"], update: ["*", "w"], delete: ["*", "d"] };

/** ¿Una política se aplica al rol de la app? (PUBLIC o el propio rol.) */
const aplicaAlRol = (p, rol) => p.roles.includes("public") || p.roles.includes(rol);

/** Políticas de una tabla → qué operaciones cubre con filtro por negocio y qué políticas permisivas no filtran. */
export function evaluarPoliticas(politicas, nombreRol = ROL_APP) {
  const permisivas = politicas.filter((p) => p.permisiva && aplicaAlRol(p, nombreRol));
  const problemas = [];
  const cubre = (op) => permisivas.some((p) => {
    if (!ENTRE[op].includes(p.cmd)) return false;
    if (op === "insert") return TENANT_EN_EXPR(p.check) || (p.cmd === "*" && p.check == null && TENANT_EN_EXPR(p.qual));
    if (op === "update") return TENANT_EN_EXPR(p.qual) && (p.check == null || TENANT_EN_EXPR(p.check));
    return TENANT_EN_EXPR(p.qual);
  });
  for (const [op, verbo] of OPS) if (!cubre(op)) problemas.push(`ninguna política filtra por app.tenant_id al ${verbo} (${op})`);
  for (const p of permisivas) {
    const exprs = [p.qual, p.check].filter((e) => e != null);
    if (!exprs.length || exprs.some((e) => !TENANT_EN_EXPR(e))) problemas.push(`la política permisiva «${p.nombre}» no filtra por tenant_id (${exprs.join(" / ") || "sin condición"}): se suma a las demás y abre filas de otros negocios`);
  }
  return problemas;
}

export async function auditarBase(client, { rol: nombreRol = ROL_APP } = {}) {
  const problemas = [], avisos = [];
  const q = async (sql, params = []) => (await client.query(sql, params)).rows;

  // Tablas (sin las de extensiones) y sus políticas
  const tablas = await q(`
    select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as forzada,
      exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'tenant_id' and a.attnum > 0 and not a.attisdropped) as tiene_tenant,
      (select a.attnotnull from pg_attribute a where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped) as tenant_not_null,
      exists (select 1 from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
        where k.conrelid = c.oid and k.contype = 'f' and a.attname = 'tenant_id' and k.confrelid = to_regclass('public.organizations')) as fk_negocio
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
    order by c.relname`);
  const politicas = await q(`
    select c.relname as tabla, p.polname as nombre, p.polcmd as cmd, p.polpermissive as permisiva,
      array(select (case when r = 0 then 'public' else (select rolname::text from pg_roles where oid = r) end)::text from unnest(p.polroles) r) as roles,
      pg_get_expr(p.polqual, p.polrelid) as qual, pg_get_expr(p.polwithcheck, p.polrelid) as check
    from pg_policy p join pg_class c on c.oid = p.polrelid where c.relnamespace = 'public'::regnamespace order by 1, 2`);
  const porTabla = new Map();
  for (const p of politicas) porTabla.set(p.tabla, [...(porTabla.get(p.tabla) ?? []), p]);

  const conTenant = [], sinTenant = [];
  for (const t of tablas) {
    const pols = porTabla.get(t.tabla) ?? [];
    if (t.tiene_tenant) {
      const errores = [];
      if (!t.rls) errores.push("la seguridad por filas (RLS) no está activada");
      if (!t.forzada) errores.push("RLS no está forzada (el propietario de la tabla se la saltaría): falta «force row level security»");
      if (!pols.length) errores.push("no tiene ninguna política");
      else errores.push(...evaluarPoliticas(pols, nombreRol));
      for (const e of errores) problemas.push(`${t.tabla}: ${e}`);
      if (t.tenant_not_null === false) avisos.push(`${t.tabla}: tenant_id admite nulos (sus filas quedarían fuera de todo negocio)`);
      if (!t.fk_negocio) avisos.push(`${t.tabla}: tenant_id no referencia a organizations(id) (borrar el negocio no arrastraría sus filas)`);
      conTenant.push({ tabla: t.tabla, rls: t.rls, forzada: t.forzada, politicas: pols.map((p) => p.nombre), errores });
    } else {
      const g = Object.hasOwn(GLOBALES, t.tabla) ? GLOBALES[t.tabla] : null;
      if (!g) problemas.push(`${t.tabla}: no tiene tenant_id y no está en la lista de tablas globales (GLOBALES en scripts/audit-tenancy.mjs). Si guarda datos de un negocio, añade tenant_id y RLS; si de verdad es global, justifícalo en esa lista`);
      sinTenant.push({ tabla: t.tabla, motivo: g?.motivo ?? null, rls: t.rls });
    }
  }
  const existentes = new Set(tablas.map((t) => t.tabla));
  for (const nombre of Object.keys(GLOBALES)) if (!existentes.has(nombre)) avisos.push(`${nombre}: está en la lista de tablas globales pero no existe en la base (lista desactualizada)`);

  // El rol con el que se ejecuta cada transacción de negocio
  const [rol] = await q(`select rolsuper, rolbypassrls, rolcanlogin, pg_has_role(current_user, oid, 'member') as miembro from pg_roles where rolname = $1`, [nombreRol]);
  if (!rol) problemas.push(`el rol ${nombreRol} no existe: withTenant() cambia a él en cada transacción (¿falta aplicar la migración 0003?)`);
  else {
    if (rol.rolsuper) problemas.push(`${nombreRol} es superusuario: se salta RLS`);
    if (rol.rolbypassrls) problemas.push(`${nombreRol} tiene BYPASSRLS: se salta RLS`);
    if (!rol.miembro) problemas.push(`la conexión no puede cambiar a ${nombreRol} (falta «grant ${nombreRol} to <usuario de conexión>»): withTenant() fallaría en cada petición`);
    for (const [nombre, g] of Object.entries(GLOBALES)) {
      if (!existentes.has(nombre) || g.app === "catalogo" || g.app === "capa") continue;
      const cols = (await q("select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position", [nombre])).map((r) => r.column_name);
      const solo = typeof g.app === "object" ? g.app.solo : [];
      const [t] = await q("select has_table_privilege($1, $2, 'INSERT,UPDATE,DELETE,TRUNCATE') as escribe, has_table_privilege($1, $2, 'SELECT') as lee", [nombreRol, `public.${nombre}`]);
      if (t.escribe) problemas.push(`${nombre}: ${nombreRol} puede escribir (la app solo debe tocarla fuera de withTenant)`);
      if (t.lee) problemas.push(`${nombre}: ${nombreRol} puede leer toda la tabla`);
      for (const col of cols) {
        const [p] = await q("select has_column_privilege($1, $2, $3, 'SELECT') as lee, has_column_privilege($1, $2, $3, 'INSERT,UPDATE') as escribe", [nombreRol, `public.${nombre}`, col]);
        if (p.escribe) problemas.push(`${nombre}.${col}: ${nombreRol} puede escribirla`);
        if (p.lee && !solo.includes(col)) problemas.push(`${nombre}.${col}: ${nombreRol} puede leerla (solo se permite ${solo.length ? solo.join(", ") : "nada"})`);
      }
    }
  }

  // Vistas y funciones que se ejecutan con los permisos de su propietario (suele saltarse RLS)
  const nombresTenant = new Set(conTenant.map((t) => t.tabla));
  const vistas = await q(`
    select v.relname as vista, v.relkind as tipo, coalesce(v.reloptions, '{}') as opciones,
      array(select distinct t.relname::text from pg_rewrite rw join pg_depend d on d.objid = rw.oid and d.classid = 'pg_rewrite'::regclass and d.refclassid = 'pg_class'::regclass
        join pg_class t on t.oid = d.refobjid where rw.ev_class = v.oid and t.oid <> v.oid and t.relnamespace = 'public'::regnamespace) as depende_de
    from pg_class v where v.relnamespace = 'public'::regnamespace and v.relkind in ('v', 'm')
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = v.oid and d.deptype = 'e') order by 1`);
  const tocaNegocio = new Set(vistas.filter((v) => v.depende_de.some((d) => nombresTenant.has(d))).map((v) => v.vista));
  for (let cambios = true; cambios;) { // una vista sobre una vista que toca negocio también la toca
    cambios = false;
    for (const v of vistas) if (!tocaNegocio.has(v.vista) && v.depende_de.some((d) => tocaNegocio.has(d))) { tocaNegocio.add(v.vista); cambios = true; }
  }
  for (const v of vistas) {
    if (!tocaNegocio.has(v.vista)) continue;
    if (v.tipo === "m") problemas.push(`${v.vista}: vista materializada sobre tablas de negocio (guarda una copia sin RLS)`);
    else if (!v.opciones.some((o) => /^security_invoker=(true|on|1)$/i.test(o))) problemas.push(`${v.vista}: vista sobre tablas de negocio sin security_invoker: se ejecuta con los permisos de su propietario y se salta RLS`);
  }
  const funciones = await q(`select p.proname as funcion, pg_get_function_identity_arguments(p.oid) as args from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e') order by 1`);
  for (const f of funciones) problemas.push(`${f.funcion}(${f.args}): función SECURITY DEFINER en public: se ejecuta con los permisos de su propietario y se salta RLS`);

  return { tablas: conTenant, globales: sinTenant, problemas, avisos, conTenant: new Set(nombresTenant), sinTenant: new Set(sinTenant.map((t) => t.tabla)), vistas: new Set(vistas.map((v) => v.vista)) };
}

// ───────────────────────── 5: usos de sys() ─────────────────────────
function* archivos(dir) {
  for (const f of readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== "node_modules" && f !== ".next") yield* archivos(p); }
    else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts")) yield p;
  }
}
const literales = (nodo, sf, salida = []) => {
  if (ts.isStringLiteral(nodo) || ts.isNoSubstitutionTemplateLiteral(nodo)) salida.push({ texto: nodo.text, dinamico: false });
  else if (ts.isTemplateExpression(nodo)) salida.push({ texto: [nodo.head.text, ...nodo.templateSpans.map((s) => s.literal.text)].join(" "), dinamico: true });
  // forEachChild se detiene si la función devuelve algo: por eso las llaves
  ts.forEachChild(nodo, (h) => { literales(h, sf, salida); });
  return salida;
};
const ES_SQL = /\b(select|insert\s+into|update|delete\s+from)\b/i;
const TABLAS_EN_SQL = /\b(?:from|join|update|into)\s+([a-z_][a-z0-9_]*)/gi;

/** Funciones del archivo que reciben la transacción (c) y se llaman desde dentro de sys(): su SQL también cuenta. */
function ayudantesDelArchivo(sf) {
  const m = new Map();
  const visita = (n) => {
    if (ts.isFunctionDeclaration(n) && n.name) m.set(n.name.text, n);
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) m.set(n.name.text, n.initializer);
    ts.forEachChild(n, visita);
  };
  visita(sf);
  return m;
}
const nombreDe = (nodo) => {
  for (let p = nodo.parent; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && p.name) return p.name.text;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (ts.isMethodDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  }
  return "(módulo)";
};

/**
 * Busca cada llamada a sys() en el código y la clasifica según las tablas que toca (relaciones: tablas de la base).
 * Categorías: negocio (FALLA: tabla de negocio fuera de withTenant), globales, sesion, credencial, otros.
 */
export function clasificarSys(srcDir, relaciones) {
  const usos = [], problemas = [];
  for (const archivo of archivos(srcDir)) {
    const rel = path.relative(path.dirname(srcDir), archivo).split(path.sep).join("/");
    if (rel === "src/server/db.ts") continue; // aquí se define sys() y withTenant() se construye sobre él
    const texto = readFileSync(archivo, "utf8");
    if (!/\bsys\b/.test(texto)) continue;
    const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.ES2022, true, archivo.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const ayudantes = ayudantesDelArchivo(sf);
    const llamadas = [];
    (function buscar(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "sys") llamadas.push(n);
      ts.forEachChild(n, buscar);
    })(sf);
    for (const llamada of llamadas) {
      const fuente = llamada.getText(sf);
      const sql = [], delegadas = [];
      const sumar = (nodo, vistos) => {
        for (const l of literales(nodo, sf)) if (ES_SQL.test(l.texto)) sql.push(l);
        (function cuerpo(n) {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.arguments[0] && ts.isIdentifier(n.arguments[0]) && n.arguments[0].text === "c" && !["one", "all"].includes(n.expression.text)) {
            const nombre = n.expression.text, def = ayudantes.get(nombre);
            if (!def) delegadas.push(nombre);
            else if (!vistos.has(nombre)) { vistos.add(nombre); sumar(def, vistos); }
          }
          ts.forEachChild(n, cuerpo);
        })(nodo);
      };
      sumar(llamada, new Set());
      const tablas = new Set();
      for (const l of sql) for (const m of l.texto.matchAll(TABLAS_EN_SQL)) if (relaciones.conTenant.has(m[1]) || relaciones.sinTenant.has(m[1]) || relaciones.vistas.has(m[1])) tablas.add(m[1].toLowerCase());
      const textoSql = sql.map((l) => l.texto).join(" ; ");
      const delNegocio = [...tablas].filter((t) => relaciones.conTenant.has(t));
      const todasDeCuenta = [...tablas].every((t) => SOLO_GLOBALES.has(t) || DE_CUENTA.has(t));
      let categoria, porque;
      if (delNegocio.length) { categoria = "negocio"; porque = `toca ${delNegocio.join(", ")} (tablas de negocio) fuera de withTenant()`; }
      else if (delegadas.length) { categoria = "otros"; porque = `delega en ${delegadas.join(", ")} (fuera de este archivo): revisar a mano`; }
      else if (sql.some((l) => l.dinamico)) { categoria = "otros"; porque = "SQL construido con interpolación: revisar a mano"; }
      else if (!tablas.size) { categoria = "otros"; porque = "no se reconoce ninguna tabla en su SQL"; }
      else if ([...tablas].every((t) => SOLO_GLOBALES.has(t))) { categoria = "globales"; porque = `solo ${[...tablas].join(", ")}`; }
      else if (!todasDeCuenta) { categoria = "otros"; porque = `${[...tablas].join(", ")}: no se reconoce cómo se acota`; }
      else if (DE_INVITACION.test(fuente)) { categoria = "credencial"; porque = `${[...tablas].join(", ")}: el negocio y el rol salen de una invitación validada con su token`; }
      else if (SESION_DIRECTA.test(fuente)) { categoria = "sesion"; porque = `${[...tablas].join(", ")} filtrado por un identificador de la sesión`; }
      else if (POR_CREDENCIAL.test(textoSql)) { categoria = "credencial"; porque = `${[...tablas].join(", ")} identificado por credencial o dato público (email, token, código, evento firmado, alta)`; }
      else if (SESION_POR_PARAMETRO.test(fuente)) { categoria = "sesion"; porque = `${[...tablas].join(", ")} filtrado por un identificador que llega como parámetro (los llamadores lo sacan de la sesión)`; }
      else { categoria = "otros"; porque = `${[...tablas].join(", ")}: no se reconoce cómo se acota`; }
      const { line } = sf.getLineAndCharacterOfPosition(llamada.getStart(sf));
      usos.push({ archivo: rel, linea: line + 1, funcion: nombreDe(llamada), categoria, tablas: [...tablas], porque });
      if (categoria === "negocio") problemas.push(`${rel}:${line + 1} (${nombreDe(llamada)}): sys() ${porque}`);
    }
  }
  const resumen = { total: usos.length, negocio: 0, globales: 0, sesion: 0, credencial: 0, otros: 0 };
  for (const u of usos) resumen[u.categoria]++;
  return { usos, resumen, problemas };
}

// ───────────────────────── Informe ─────────────────────────
const pad = (s, n) => String(s).padEnd(n);
export function informe(r) {
  const L = [];
  L.push("Auditoría de aislamiento entre negocios", "");
  L.push(`1) Tablas con tenant_id (${r.tablas.length}): RLS activada y forzada, con políticas`);
  for (const t of r.tablas) L.push(`   ${t.errores.length ? "✗" : "✓"} ${pad(t.tabla, 20)} RLS ${t.rls ? "sí" : "NO"} · forzada ${t.forzada ? "sí" : "NO"} · políticas: ${t.politicas.join(", ") || "ninguna"}`);
  L.push("", `2) Tablas sin tenant_id (${r.globales.length}): globales, con su motivo`);
  for (const t of r.globales) L.push(`   ${t.motivo ? "✓" : "✗"} ${pad(t.tabla, 20)} ${t.motivo ?? "SIN MOTIVO DECLARADO"}`);
  if (r.sys) {
    const s = r.sys.resumen;
    L.push("", `3) Usos de sys() en el código (${s.total}): consultas fuera de withTenant()`);
    L.push(`   · solo tablas globales sin datos de negocio: ${s.globales}`, `   · filtrado por la sesión (organizations, memberships… con el negocio o la persona de la sesión): ${s.sesion}`,
      `   · por credencial o dato público antes de tener sesión (email, token, código, evento de Stripe): ${s.credencial}`, `   · otros, a revisar a mano: ${s.otros}`, `   · tablas de negocio fuera de withTenant(): ${s.negocio}`);
    for (const u of r.sys.usos.filter((x) => x.categoria === "otros" || x.categoria === "negocio")) L.push(`     ${u.categoria === "negocio" ? "✗" : "?"} ${u.archivo}:${u.linea} ${u.funcion}: ${u.porque}`);
  }
  if (r.avisos.length) { L.push("", "Avisos (no fallan):"); for (const a of r.avisos) L.push(`   ! ${a}`); }
  L.push("");
  if (r.problemas.length) { L.push(`✗ FALLA: ${r.problemas.length} problema${r.problemas.length > 1 ? "s" : ""} de aislamiento`); for (const p of r.problemas) L.push(`   ✗ ${p}`); }
  else L.push(`✓ Aislamiento correcto: ${r.tablas.length} tablas de negocio con RLS forzada, ${r.globales.length} globales justificadas${r.sys ? `, ${r.sys.resumen.total} usos de sys() sin tablas de negocio` : ""}.`);
  return L.join("\n");
}

/** Avisos de configuración peligrosa del entorno (no fallan el despliegue: lo deciden las variables de Vercel, no el código). */
export function avisosDeEntorno(env = process.env) {
  const a = [];
  const proveedorDev = (env.EMAIL_PROVIDER || (env.RESEND_API_KEY ? "resend" : "dev")) === "dev";
  if (env.ALLOW_DEV_MAILBOX === "1" && proveedorDev && (env.VERCEL_ENV === "production" || env.NODE_ENV === "production" && env.VERCEL))
    a.push("ALLOW_DEV_MAILBOX=1 con correo «dev» en producción: /dev/correo enseñaría los correos (códigos de acceso) de TODOS los negocios. Quita la variable");
  return a;
}

export async function auditar({ url, src = path.join(AQUI, "src"), env = process.env } = {}) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const r = await auditarBase(client);
    r.sys = existsSync(src) ? clasificarSys(src, r) : null;
    if (r.sys) r.problemas.push(...r.sys.problemas);
    r.avisos.push(...avisosDeEntorno(env));
    return r;
  } finally {
    await client.end();
  }
}

async function main(argv) {
  if (process.env.SKIP_TENANCY_AUDIT === "1") { console.warn("[audit-tenancy] ⚠ AUDITORÍA OMITIDA (SKIP_TENANCY_AUDIT=1): el aislamiento entre negocios NO se ha comprobado en este despliegue"); return 0; }
  cargarEntorno();
  const url = urlDeBase();
  if (!url) {
    if (process.env.SKIP_MIGRATIONS_IF_NO_DB === "1") { console.log("[audit-tenancy] sin DATABASE_URL: se omite"); return 0; }
    console.error("[audit-tenancy] Falta DATABASE_URL: no se puede comprobar el aislamiento entre negocios.");
    return 1;
  }
  const i = argv.indexOf("--src");
  const src = i >= 0 ? path.resolve(argv[i + 1]) : path.join(AQUI, "src");
  // Modo aviso (--aviso o TENANCY_AUDIT_MODE=aviso): saca el mismo informe pero no bloquea el despliegue. Es la puesta en marcha en el entorno real
  // (Neon), donde la auditoría aún no se ha visto pasar: se mira el informe del build y, con él limpio, se quita --aviso del script build.
  const aviso = argv.includes("--aviso") || process.env.TENANCY_AUDIT_MODE === "aviso";
  const AVISO = "[audit-tenancy] ⚠ MODO AVISO: el despliegue NO se bloquea aunque la auditoría falle. Mira el informe, arregla lo que diga y quita --aviso del script «build» de package.json para que vuelva a bloquear.";
  let r;
  try { r = await auditar({ url, src }); } catch (e) { console.error("[audit-tenancy] no se pudo auditar la base:", e.message); if (aviso) { console.warn(AVISO); return 0; } return 2; }
  if (argv.includes("--json")) console.log(JSON.stringify({ ...r, conTenant: undefined, sinTenant: undefined, vistas: undefined }, null, 2));
  else console.log(informe(r));
  if (r.problemas.length && aviso) { console.warn(AVISO); return 0; }
  return r.problemas.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main(process.argv.slice(2));

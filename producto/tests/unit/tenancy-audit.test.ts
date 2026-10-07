// Auditoría de aislamiento (scripts/audit-tenancy.mjs, Task 12 / B1). Se prueba contra una base de datos TEMPORAL: se crea una
// vacía, se le aplican las migraciones reales y después se le van haciendo trampas (una tabla nueva sin RLS, una política que
// abre todo, una vista que se salta RLS…) para comprobar que el script las detecta y sale con código ≠ 0.
// Solo se ejecuta contra un Postgres local (nunca contra una base remota); sin Postgres, se omite con un aviso
// (REQUIRE_DB_TESTS=1 lo convierte en fallo).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = path.join(RAIZ, "scripts/audit-tenancy.mjs");

type Politica = { nombre: string; cmd: string; permisiva: boolean; roles: string[]; qual: string | null; check: string | null };
type Relaciones = { conTenant: Set<string>; sinTenant: Set<string>; vistas: Set<string> };
type Uso = { archivo: string; linea: number; funcion: string; categoria: "negocio" | "globales" | "sesion" | "credencial" | "otros"; tablas: string[]; porque: string };
type Auditoria = Relaciones & {
  tablas: { tabla: string; rls: boolean; forzada: boolean; politicas: string[]; errores: string[] }[];
  globales: { tabla: string; motivo: string | null }[];
  problemas: string[]; avisos: string[];
  sys: { usos: Uso[]; resumen: Record<string, number>; problemas: string[] } | null;
};
type Modulo = {
  GLOBALES: Record<string, { motivo: string }>;
  auditar(o: { url: string; src?: string; env?: Record<string, string> }): Promise<Auditoria>;
  auditarBase(c: pg.Client, o?: { rol?: string }): Promise<Auditoria>;
  clasificarSys(src: string, rel: Relaciones): { usos: Uso[]; resumen: Record<string, number>; problemas: string[] };
  evaluarPoliticas(p: Politica[], rol?: string): string[];
  avisosDeEntorno(env: Record<string, string>): string[];
  informe(r: Auditoria): string;
};
const mod = (await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href)) as unknown as Modulo;

// ───────────────────────── Base temporal ─────────────────────────
const base = new URL(process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev");
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(base.hostname);
const urlDe = (db: string) => { const u = new URL(base); u.pathname = "/" + db; return u.toString(); };
const NOMBRE = `restora_tenancy_${process.pid}_${Date.now().toString(36)}`;
const admin = () => new pg.Client({ connectionString: urlDe("postgres") });

async function hayPostgres(): Promise<boolean> {
  if (!LOCAL) { console.warn(`[tenancy-audit] DATABASE_URL apunta a ${base.hostname}: estas pruebas solo se ejecutan contra un Postgres local`); return false; }
  const c = admin();
  try { await c.connect(); await c.end(); return true; } catch { return false; }
}
const hayDb = await hayPostgres();
if (!hayDb && process.env.REQUIRE_DB_TESTS === "1") throw new Error("REQUIRE_DB_TESTS=1 pero no hay un Postgres local accesible");
if (!hayDb) console.warn("[tenancy-audit] sin Postgres local: se omiten las pruebas de la auditoría contra una base temporal");

let db: pg.Client;
let tmp: string;
const src = path.join(RAIZ, "src");
const cli = (extra: Record<string, string> = {}, args: string[] = []) => spawnSync(process.execPath, [SCRIPT, ...args], {
  cwd: RAIZ, encoding: "utf8",
  env: { ...process.env, DATABASE_URL: urlDe(NOMBRE), DATABASE_URL_UNPOOLED: urlDe(NOMBRE), SKIP_TENANCY_AUDIT: "", ...extra },
});
const sql = (q: string) => db.query(q);
const auditar = () => mod.auditar({ url: urlDe(NOMBRE), src, env: {} });
const RLS_BIEN = `using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) with check (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)`;

describe.skipIf(!hayDb)("auditoría de aislamiento contra una base temporal", () => {
  beforeAll(async () => {
    const a = admin(); await a.connect();
    await a.query(`create database "${NOMBRE}"`);
    await a.end();
    // Las migraciones reales, aplicadas con el mismo script que usa el despliegue
    const r = spawnSync(process.execPath, [path.join(RAIZ, "scripts/migrate.mjs")], {
      cwd: RAIZ, encoding: "utf8", env: { ...process.env, DATABASE_URL: urlDe(NOMBRE), DATABASE_URL_UNPOOLED: urlDe(NOMBRE) },
    });
    if (r.status !== 0) throw new Error("no se pudieron aplicar las migraciones en la base temporal:\n" + r.stdout + r.stderr);
    db = new pg.Client({ connectionString: urlDe(NOMBRE) });
    await db.connect();
    tmp = mkdtempSync(path.join(tmpdir(), "audit-sys-"));
  }, 60_000);
  afterAll(async () => {
    await db?.end().catch(() => {});
    const a = admin(); await a.connect();
    await a.query(`drop database if exists "${NOMBRE}" with (force)`);
    await a.end();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it("el esquema real pasa: todas las tablas de negocio con RLS forzada y política, y ningún sys() toca negocio", async () => {
    const r = await auditar();
    expect(r.problemas).toEqual([]);
    expect(r.tablas.length).toBeGreaterThanOrEqual(18);
    for (const t of r.tablas) expect(t, t.tabla).toMatchObject({ rls: true, forzada: true, errores: [] });
    expect(r.tablas.map((t) => t.tabla)).toEqual(expect.arrayContaining(["documentos", "compra_lineas", "avisos_estado", "audit_log"]));
    // Las tablas globales son las de la lista, cada una con su motivo
    expect(r.globales.every((g) => g.motivo)).toBe(true);
    // playing_with_neon la crea la guía de inicio de Neon en producción: está declarada, pero no sale de las migraciones
    const ajenas = new Set(["playing_with_neon"]);
    expect(r.globales.map((g) => g.tabla).sort()).toEqual(Object.keys(mod.GLOBALES).filter((k) => !ajenas.has(k)).sort());
    expect(cli().status).toBe(0);
  });

  it("clasifica todos los usos de sys() del código y ninguno queda sin clasificar", async () => {
    const r = await auditar();
    const s = r.sys!;
    expect(s.resumen.negocio).toBe(0);
    expect(s.resumen.otros, s.usos.filter((u) => u.categoria === "otros").map((u) => `${u.archivo}:${u.linea} ${u.porque}`).join("\n")).toBe(0);
    expect(s.resumen.globales + s.resumen.sesion + s.resumen.credencial).toBe(s.resumen.total);
    // Se cuentan todas las llamadas: el mismo recuento, a ojo, sobre el texto (sin comentarios)
    const fs = await import("node:fs");
    let aOjo = 0;
    const visita = (d: string) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) visita(p);
        else if (/\.tsx?$/.test(f) && p !== path.join(src, "server/db.ts")) aOjo += (fs.readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").match(/\bsys\(/g) ?? []).length;
      }
    };
    visita(src);
    expect(s.resumen.total).toBe(aOjo);
  });

  describe("una tabla nueva con tenant_id", () => {
    it("sin RLS, sin RLS forzada, sin política y con la política buena: solo la última pasa", async () => {
      await sql("create table fuga_prueba (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references organizations(id) on delete cascade, dato text)");
      let r = await auditar();
      expect(r.problemas.some((p) => p.startsWith("fuga_prueba:") && /no está activada/.test(p))).toBe(true);
      const sal = cli();
      expect(sal.status).toBe(1);
      expect(sal.stdout).toMatch(/fuga_prueba: la seguridad por filas \(RLS\) no está activada/);

      await sql("alter table fuga_prueba enable row level security");
      r = await auditar();
      expect(r.problemas.some((p) => p.startsWith("fuga_prueba:") && /no está forzada/.test(p))).toBe(true);
      expect(r.problemas.some((p) => p.startsWith("fuga_prueba:") && /no tiene ninguna política/.test(p))).toBe(true);

      await sql("alter table fuga_prueba force row level security");
      r = await auditar();
      expect(r.problemas.filter((p) => p.startsWith("fuga_prueba:"))).toEqual(["fuga_prueba: no tiene ninguna política"]);
      expect(cli().status).toBe(1);

      await sql(`create policy tenant_isolation on fuga_prueba ${RLS_BIEN}`);
      r = await auditar();
      expect(r.problemas).toEqual([]);
      expect(cli().status).toBe(0);
    });

    it("una política que no filtra por negocio, o una segunda permisiva que lo abre todo, falla", async () => {
      await sql("drop policy tenant_isolation on fuga_prueba");
      await sql("create policy abierta on fuga_prueba using (true)");
      let r = await auditar();
      expect(r.problemas.some((p) => p.startsWith("fuga_prueba:") && /ninguna política filtra por app\.tenant_id/.test(p))).toBe(true);
      expect(r.problemas.some((p) => /«abierta» no filtra por tenant_id/.test(p))).toBe(true);

      // La buena sola pasa, pero con la abierta al lado sigue fallando (las permisivas se suman)
      await sql(`create policy tenant_isolation on fuga_prueba ${RLS_BIEN}`);
      r = await auditar();
      expect(r.problemas.filter((p) => p.startsWith("fuga_prueba:"))).toEqual([expect.stringMatching(/«abierta» no filtra por tenant_id/)]);
      await sql("drop policy abierta on fuga_prueba");
      expect((await auditar()).problemas).toEqual([]);
    });

    it("una política solo de lectura deja sin cubrir crear, cambiar y borrar", async () => {
      await sql("drop policy tenant_isolation on fuga_prueba");
      await sql(`create policy solo_leer on fuga_prueba for select using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)`);
      const r = await auditar();
      const mias = r.problemas.filter((p) => p.startsWith("fuga_prueba:"));
      expect(mias).toHaveLength(3);
      expect(mias.join("\n")).toMatch(/al crear \(insert\)/);
      expect(mias.join("\n")).toMatch(/al cambiar \(update\)/);
      expect(mias.join("\n")).toMatch(/al borrar \(delete\)/);
      await sql("drop policy solo_leer on fuga_prueba");
      await sql(`create policy tenant_isolation on fuga_prueba ${RLS_BIEN}`);
    });

    it("avisa (sin fallar) si tenant_id admite nulos o no referencia al negocio", async () => {
      await sql("create table sin_fk (id int primary key, tenant_id uuid)");
      await sql("alter table sin_fk enable row level security; alter table sin_fk force row level security");
      await sql(`create policy tenant_isolation on sin_fk ${RLS_BIEN}`);
      const r = await auditar();
      expect(r.problemas).toEqual([]);
      expect(r.avisos.join("\n")).toMatch(/sin_fk: tenant_id admite nulos/);
      expect(r.avisos.join("\n")).toMatch(/sin_fk: tenant_id no referencia a organizations/);
      await sql("drop table sin_fk");
    });
  });

  describe("una tabla nueva sin tenant_id", () => {
    it("falla si no está en la lista de globales con su motivo", async () => {
      await sql("create table datos_sueltos (id int primary key, cliente text)");
      const r = await auditar();
      expect(r.problemas).toEqual([expect.stringMatching(/^datos_sueltos: no tiene tenant_id y no está en la lista de tablas globales/)]);
      expect(cli().status).toBe(1);
      await sql("drop table datos_sueltos");
      expect((await auditar()).problemas).toEqual([]);
    });
  });

  describe("el rol de la app", () => {
    it("se comprueba que el rol no salta RLS (aquí, con un rol que sí la salta)", async () => {
      const r = await mod.auditarBase(db, { rol: "restora" });
      expect(r.problemas.join("\n")).toMatch(/restora tiene BYPASSRLS/);
    });
    it("un rol que no existe falla", async () => {
      const r = await mod.auditarBase(db, { rol: "restora_app_que_no_existe" });
      expect(r.problemas.join("\n")).toMatch(/el rol restora_app_que_no_existe no existe/);
    });
    it("falla si la app pudiera leer una tabla global sensible, o columnas de usuarios que no son id y nombre", async () => {
      await sql("grant select on sessions to restora_app");
      let r = await auditar();
      expect(r.problemas.join("\n")).toMatch(/sessions: restora_app puede leer toda la tabla/);
      await sql("revoke select on sessions from restora_app");
      await sql("grant select (email) on users to restora_app");
      r = await auditar();
      expect(r.problemas).toEqual([expect.stringMatching(/users\.email: restora_app puede leerla \(solo se permite id, name\)/)]);
      await sql("revoke select (email) on users from restora_app");
      await sql("grant update (name) on users to restora_app");
      r = await auditar();
      expect(r.problemas.join("\n")).toMatch(/users\.name: restora_app puede escribirla/);
      await sql("revoke update (name) on users from restora_app");
      expect((await auditar()).problemas).toEqual([]);
    });
  });

  describe("vistas y funciones que se saltan RLS", () => {
    it("una vista sobre una tabla de negocio sin security_invoker falla; con security_invoker pasa", async () => {
      await sql("create view v_docs as select id, numero from documentos");
      let r = await auditar();
      expect(r.problemas).toEqual([expect.stringMatching(/^v_docs: vista sobre tablas de negocio sin security_invoker/)]);
      await sql("create view v_docs2 as select * from v_docs");
      r = await auditar();
      expect(r.problemas.map((p) => p.split(":")[0]).sort()).toEqual(["v_docs", "v_docs2"]);
      await sql("drop view v_docs2");
      await sql("alter view v_docs set (security_invoker = true)");
      expect((await auditar()).problemas).toEqual([]);
      await sql("drop view v_docs");
    });
    it("la vista de la capa anónima (sin tablas de negocio) no es un problema", async () => {
      const r = await auditar();
      expect(r.vistas.has("bench_price_k")).toBe(true);
      expect(r.problemas).toEqual([]);
    });
    it("una vista materializada sobre negocio, o una función SECURITY DEFINER, fallan", async () => {
      await sql("create materialized view m_docs as select id from documentos");
      expect((await auditar()).problemas).toEqual([expect.stringMatching(/^m_docs: vista materializada sobre tablas de negocio/)]);
      await sql("drop materialized view m_docs");
      await sql("create function dame_todo() returns bigint language sql security definer as $$ select count(*) from documentos $$");
      expect((await auditar()).problemas).toEqual([expect.stringMatching(/^dame_todo\(\): función SECURITY DEFINER/)]);
      await sql("drop function dame_todo()");
      expect((await auditar()).problemas).toEqual([]);
    });
  });

  describe("clasificación de sys() sobre código de ejemplo", () => {
    const escribe = (nombre: string, codigo: string) => {
      const dir = path.join(tmp, nombre, "src");
      mkdirSync(path.join(dir, "app"), { recursive: true });
      writeFileSync(path.join(dir, "app/ejemplo.ts"), codigo);
      return dir;
    };
    const clasifica = async (nombre: string, codigo: string) => mod.clasificarSys(escribe(nombre, codigo), await auditar());

    it("una consulta de negocio dentro de sys() es un fallo", async () => {
      const r = await clasifica("negocio", `import { sys, one } from "@/server/db";\nexport const f = (id: string) => sys((c) => one(c, "select numero from documentos where id = $1", [id]));`);
      expect(r.resumen).toMatchObject({ total: 1, negocio: 1 });
      expect(r.problemas).toEqual([expect.stringMatching(/ejemplo\.ts:2 \(f\): sys\(\) toca documentos \(tablas de negocio\) fuera de withTenant/)]);
    });
    it("también si la consulta está en una función auxiliar del mismo archivo", async () => {
      const r = await clasifica("auxiliar", `import { sys } from "@/server/db";\nasync function borra(c: unknown, id: string) { await (c as { query: (s: string, p: unknown[]) => Promise<unknown> }).query("delete from proveedores where id = $1", [id]); }\nexport const f = (id: string) => sys(async (c) => { await borra(c, id); });`);
      expect(r.resumen.negocio).toBe(1);
      expect(r.problemas[0]).toMatch(/toca proveedores/);
    });
    it("y también con un INSERT, un JOIN o una consulta anidada", async () => {
      const r = await clasifica("variantes", `import { sys } from "@/server/db";
export const a = () => sys((c) => c.query("insert into recetas (tenant_id) values ($1)", []));
export const b = () => sys((c) => c.query("select u.id from users u join memberships m on m.user_id = u.id join articulos a on a.tenant_id = m.org_id", []));
export const d = () => sys((c) => c.query(\`select * from (select id from stock_movimientos) x\`, []));`);
      expect(r.resumen.negocio).toBe(3);
    });
    it("una función de otro archivo con la transacción se marca para revisar a mano", async () => {
      const r = await clasifica("delegada", `import { sys } from "@/server/db";\nimport { hazAlgo } from "./otro";\nexport const f = () => sys(async (c) => { await hazAlgo(c, 1); });`);
      expect(r.resumen).toMatchObject({ total: 1, otros: 1, negocio: 0 });
      expect(r.usos[0].porque).toMatch(/delega en hazAlgo/);
    });
    it("el SQL construido con interpolación se marca para revisar a mano", async () => {
      const r = await clasifica("dinamico", "import { sys } from \"@/server/db\";\nexport const f = (t: string) => sys((c) => c.query(`select * from ${t}`, []));");
      expect(r.resumen).toMatchObject({ total: 1, otros: 1 });
    });
    it("distingue solo globales, filtrado por la sesión y por credencial", async () => {
      const r = await clasifica("buenas", `import { sys, one } from "@/server/db";
export const g = () => sys((c) => c.query("select id from catalog_items", []));
export const s = (ctx: { tenantId: string }) => sys((c) => c.query("update organizations set name = $2 where id = $1", [ctx.tenantId, "x"]));
export const k = (token: string) => sys((c) => one(c, "select org_id from invitations where token_hash = $1", [token]));
export const e = (email: string) => sys((c) => one(c, "select id from users where lower(email) = $1", [email]));`);
      expect(r.usos.map((u) => u.categoria)).toEqual(["globales", "sesion", "credencial", "credencial"]);
      expect(r.problemas).toEqual([]);
    });
    it("lo que no se reconoce no se da por bueno", async () => {
      const r = await clasifica("raro", `import { sys } from "@/server/db";\nexport const f = (x: string) => sys((c) => c.query("update organizations set plan_status = 'active' where id = $1", [x]));`);
      expect(r.resumen).toMatchObject({ total: 1, otros: 1 });
    });
    it("no cuenta las llamadas a withTenant ni los comentarios", async () => {
      const r = await clasifica("sin", `import { withTenant } from "@/server/db";\n// sys() solo para tablas globales\nexport const f = (t: string) => withTenant(t, (c) => c.query("select * from documentos", []));`);
      expect(r.resumen.total).toBe(0);
    });
  });

  it("el informe nombra las tablas con problemas", async () => {
    await sql("create table para_informe (id int, tenant_id uuid)");
    const r = await auditar();
    const texto = mod.informe(r);
    expect(texto).toMatch(/FALLA/);
    expect(texto).toMatch(/para_informe: la seguridad por filas \(RLS\) no está activada/);
    await sql("drop table para_informe");
    expect(mod.informe(await auditar())).toMatch(/Aislamiento correcto/);
  });

  it("--aviso saca el mismo informe pero no bloquea el despliegue; sin él, sí", async () => {
    await sql("create table para_aviso (id int, tenant_id uuid)");
    const estricta = cli();
    expect(estricta.status).toBe(1);
    expect(estricta.stdout).toMatch(/para_aviso: la seguridad por filas \(RLS\) no está activada/);
    const blanda = cli({}, ["--aviso"]);
    expect(blanda.status).toBe(0);
    expect(blanda.stdout).toMatch(/para_aviso: la seguridad por filas \(RLS\) no está activada/);
    expect(blanda.stderr).toMatch(/MODO AVISO/);
    await sql("drop table para_aviso");
    const limpia = cli({}, ["--aviso"]);
    expect(limpia.status).toBe(0);
    expect(limpia.stderr).not.toMatch(/MODO AVISO/);
  });

  it("SKIP_TENANCY_AUDIT=1 es una salida de emergencia ruidosa", () => {
    const r = cli({ SKIP_TENANCY_AUDIT: "1" });
    expect(r.status).toBe(0);
    expect(r.stderr).toMatch(/AUDITORÍA OMITIDA/);
  });
});

describe("evaluación de políticas (sin base de datos)", () => {
  const expr = "(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)";
  const buena: Politica = { nombre: "tenant_isolation", cmd: "*", permisiva: true, roles: ["public"], qual: expr, check: expr };
  it("la política de las migraciones cubre las cuatro operaciones", () => {
    expect(mod.evaluarPoliticas([buena])).toEqual([]);
    expect(mod.evaluarPoliticas([{ ...buena, check: null }])).toEqual([]); // sin WITH CHECK se usa USING
  });
  it("una política para otro rol no protege al rol de la app", () => {
    expect(mod.evaluarPoliticas([{ ...buena, roles: ["otro_rol"] }])).toHaveLength(4);
    expect(mod.evaluarPoliticas([{ ...buena, roles: ["restora_app"] }])).toEqual([]);
  });
  it("insert exige el filtro en WITH CHECK y update, en los dos", () => {
    const ins: Politica = { ...buena, nombre: "i", cmd: "a", qual: null };
    expect(mod.evaluarPoliticas([ins, { ...buena, nombre: "r", cmd: "r", check: null }, { ...buena, nombre: "u", cmd: "w" }, { ...buena, nombre: "d", cmd: "d", check: null }])).toEqual([]);
    expect(mod.evaluarPoliticas([{ ...ins, check: "true" }])).not.toEqual([]);
    expect(mod.evaluarPoliticas([{ ...buena, check: "true" }]).join()).toMatch(/no filtra por tenant_id/);
  });
  it("una política restrictiva no cuenta como cobertura, pero tampoco abre filas", () => {
    expect(mod.evaluarPoliticas([{ ...buena, permisiva: false }])).toHaveLength(4);
    expect(mod.evaluarPoliticas([buena, { nombre: "extra", cmd: "*", permisiva: false, roles: ["public"], qual: "true", check: null }])).toEqual([]);
  });
  it("filtrar por otra variable no vale", () => {
    expect(mod.evaluarPoliticas([{ ...buena, qual: "(tenant_id = (current_setting('app.otra'::text))::uuid)", check: null }]).length).toBeGreaterThan(0);
  });
});

describe("avisos de entorno", () => {
  it("avisa del buzón de pruebas activo en producción con correo «dev»", () => {
    expect(mod.avisosDeEntorno({ ALLOW_DEV_MAILBOX: "1", VERCEL_ENV: "production" })).toHaveLength(1);
    expect(mod.avisosDeEntorno({ ALLOW_DEV_MAILBOX: "1", VERCEL_ENV: "production", EMAIL_PROVIDER: "dev" })).toHaveLength(1);
  });
  it("no avisa con Resend, en vista previa o sin la variable", () => {
    expect(mod.avisosDeEntorno({ ALLOW_DEV_MAILBOX: "1", VERCEL_ENV: "production", RESEND_API_KEY: "re_x" })).toEqual([]);
    expect(mod.avisosDeEntorno({ ALLOW_DEV_MAILBOX: "1", VERCEL_ENV: "preview" })).toEqual([]);
    expect(mod.avisosDeEntorno({ VERCEL_ENV: "production" })).toEqual([]);
  });
});

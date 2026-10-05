// Base de datos temporal para las pruebas unitarias que necesitan Postgres de verdad: se crea una vacía, se le aplican las migraciones
// reales y se borra al terminar. Solo contra un Postgres LOCAL (nunca contra una base remota); sin Postgres, `disponible` es false y la
// prueba se omite con un aviso (REQUIRE_DB_TESTS=1 lo convierte en fallo).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const RAIZ = fileURLToPath(new URL("../../..", import.meta.url));
const base = new URL(process.env.DATABASE_URL || "postgres://restora:restora@localhost:5432/restora_dev");
const LOCAL = ["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(base.hostname);
const urlDe = (db: string) => { const u = new URL(base); u.pathname = "/" + db; return u.toString(); };
const admin = () => new pg.Client({ connectionString: urlDe("postgres") });

export type BaseTemporal = {
  disponible: boolean;
  /** Cadena de conexión de la base temporal (solo vale después de crear()). */
  url: string;
  /** Crea la base y le aplica las migraciones. */
  crear(): Promise<void>;
  /** Cliente conectado como el propietario (salta RLS: para preparar datos de varios negocios). */
  cliente(): Promise<pg.Client>;
  /** Cierra los clientes y borra la base. */
  eliminar(): Promise<void>;
};

export async function baseTemporal(etiqueta: string): Promise<BaseTemporal> {
  let disponible = false;
  if (!LOCAL) console.warn(`[${etiqueta}] DATABASE_URL apunta a ${base.hostname}: estas pruebas solo se ejecutan contra un Postgres local`);
  else {
    const c = admin();
    try { await c.connect(); await c.end(); disponible = true; } catch { /* sin Postgres local */ }
  }
  if (!disponible && process.env.REQUIRE_DB_TESTS === "1") throw new Error("REQUIRE_DB_TESTS=1 pero no hay un Postgres local accesible");
  if (!disponible) console.warn(`[${etiqueta}] sin Postgres local: se omiten las pruebas que usan una base temporal`);
  const nombre = `restora_${etiqueta.replace(/\W+/g, "_")}_${process.pid}_${Date.now().toString(36)}`;
  const abiertos: pg.Client[] = [];
  return {
    disponible,
    url: urlDe(nombre),
    async crear() {
      const a = admin(); await a.connect();
      await a.query(`create database "${nombre}"`);
      await a.end();
      const r = spawnSync(process.execPath, [path.join(RAIZ, "scripts/migrate.mjs")], {
        cwd: RAIZ, encoding: "utf8", env: { ...process.env, DATABASE_URL: urlDe(nombre), DATABASE_URL_UNPOOLED: urlDe(nombre) },
      });
      if (r.status !== 0) throw new Error("no se pudieron aplicar las migraciones en la base temporal:\n" + r.stdout + r.stderr);
    },
    async cliente() {
      const c = new pg.Client({ connectionString: urlDe(nombre) });
      await c.connect();
      abiertos.push(c);
      return c;
    },
    async eliminar() {
      for (const c of abiertos) await c.end().catch(() => {});
      const a = admin(); await a.connect();
      await a.query(`drop database if exists "${nombre}" with (force)`);
      await a.end();
    },
  };
}

// Índices de rendimiento (db/migrations/0010_indices_rendimiento.sql, Task 18 / B7) contra una base temporal con las migraciones reales:
// están todos, cada uno empieza por la columna para la que se creó (una clave foránea solo se comprueba rápido si su columna encabeza un índice)
// y la migración se puede volver a ejecutar sin error y sin duplicar nada. Sin Postgres local, se omite (REQUIRE_DB_TESTS=1 lo convierte en fallo).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { baseTemporal } from "./helpers/db-temporal";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const SQL = readFileSync(path.join(RAIZ, "db/migrations/0010_indices_rendimiento.sql"), "utf8");

// índice → tabla y columnas en orden. Los siete primeros cubren claves foráneas de tablas que se borran en cascada; los otros cuatro son índices
// que empiezan por tenant_id (por negocio, o por negocio y local) en tablas que se leen por negocio.
const ESPERADOS: { indice: string; tabla: string; columnas: string[]; porque: string }[] = [
  { indice: "ventas_lineas_import_idx", tabla: "ventas_lineas", columnas: ["import_id"], porque: "borrar una importación de ventas" },
  { indice: "ventas_lineas_receta_idx", tabla: "ventas_lineas", columnas: ["receta_id"], porque: "borrar un plato o un negocio" },
  { indice: "precio_eventos_doc_idx", tabla: "precio_eventos", columnas: ["documento_id", "articulo_id"], porque: "borrar un albarán" },
  { indice: "precio_eventos_art_idx", tabla: "precio_eventos", columnas: ["articulo_id", "fecha", "created_at"], porque: "borrar un artículo y el último cambio de precio de cada uno" },
  { indice: "articulo_proveedor_prov_idx", tabla: "articulo_proveedor", columnas: ["proveedor_id"], porque: "borrar un proveedor" },
  { indice: "pedido_lineas_pedido_idx", tabla: "pedido_lineas", columnas: ["pedido_id"], porque: "las líneas de un pedido" },
  { indice: "pedido_lineas_art_idx", tabla: "pedido_lineas", columnas: ["articulo_id"], porque: "borrar un artículo" },
  { indice: "receta_lineas_tenant_sub_idx", tabla: "receta_lineas", columnas: ["tenant_id", "subreceta_id"], porque: "los avisos de todas las pantallas recorren las elaboraciones de la carta" },
  { indice: "articulo_proveedor_tenant_idx", tabla: "articulo_proveedor", columnas: ["tenant_id", "articulo_id"], porque: "los precios por proveedor de Hoy" },
  { indice: "ventas_importes_local_idx", tabla: "ventas_importes", columnas: ["tenant_id", "local_id", "desde", "created_at"], porque: "Hoy y Ventas leen las importaciones del local" },
  { indice: "pedidos_local_idx", tabla: "pedidos", columnas: ["tenant_id", "local_id", "created_at"], porque: "Pedidos e Inventario leen los pedidos del local" },
];

const bd = await baseTemporal("indices");
describe.skipIf(!bd.disponible)("índices de rendimiento contra una base temporal", () => {
  let db: pg.Client;
  const indices = async () => (await db.query<{ indice: string; tabla: string; columnas: string[]; def: string; valido: boolean }>(`
    select c.relname as indice, t.relname as tabla, i.indisvalid as valido, pg_get_indexdef(i.indexrelid) as def,
      array(select a.attname::text from unnest(i.indkey) with ordinality k(attnum, ord) join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum order by k.ord) as columnas
    from pg_index i join pg_class c on c.oid = i.indexrelid join pg_class t on t.oid = i.indrelid where t.relnamespace = 'public'::regnamespace`)).rows;

  beforeAll(async () => { await bd.crear(); db = await bd.cliente(); }, 60_000);
  afterAll(async () => { await bd.eliminar(); });

  it("la migración 0010 está aplicada", async () => {
    const r = await db.query("select 1 from schema_migrations where version = '0010_indices_rendimiento.sql'");
    expect(r.rowCount).toBe(1);
  });

  it.each(ESPERADOS.map((e) => [e.indice, e.porque, e] as const))("%s existe y es válido (%s)", async (_n, _p, e) => {
    const x = (await indices()).find((i) => i.indice === e.indice);
    expect(x, `falta el índice ${e.indice}`).toBeTruthy();
    expect(x!.tabla).toBe(e.tabla);
    expect(x!.columnas).toEqual(e.columnas);
    expect(x!.valido).toBe(true);
  });

  it("los índices con orden descendente lo conservan (lo usan el último cambio de precio y las últimas importaciones)", async () => {
    const por = Object.fromEntries((await indices()).map((i) => [i.indice, i.def]));
    expect(por.precio_eventos_art_idx).toMatch(/fecha DESC, created_at DESC/);
    expect(por.ventas_importes_local_idx).toMatch(/desde DESC NULLS LAST, created_at DESC/);
    expect(por.pedidos_local_idx).toMatch(/created_at DESC/);
  });

  it("se puede volver a ejecutar sin error y sin duplicar índices (aditiva e idempotente)", async () => {
    const antes = (await indices()).map((i) => i.indice).sort();
    await db.query(SQL);
    await db.query(SQL);
    const despues = (await indices()).map((i) => i.indice).sort();
    expect(despues).toEqual(antes);
  });

  it("solo crea índices: ni tablas, ni datos, ni políticas", () => {
    const sentencias = SQL.replace(/--.*$/gm, "").split(";").map((s) => s.trim()).filter(Boolean);
    expect(sentencias.length).toBe(ESPERADOS.length);
    for (const s of sentencias) expect(s, s).toMatch(/^create index if not exists \w+ on \w+ \(/); // sin «concurrently»: migrate.mjs envuelve cada migración en una transacción
  });
});

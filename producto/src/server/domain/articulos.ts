// Operaciones de artículos compartidas: alta desde catálogo, alias aprendidos y reconstrucción de stock/PMP.
import { all, one, type Db } from "../db";
import { replay } from "@/lib/pmp";
import { norm } from "@/lib/fuzzy";
import type { BaseUnit } from "@/lib/units";
import { getCatalog } from "../queries/catalog";

export async function ivaCategoria(categoryId: string): Promise<number> {
  const { cats } = await getCatalog();
  return cats.find((c) => c.id === categoryId)?.iva ?? 10;
}

/** Devuelve el artículo del local para un elemento del catálogo, creándolo si no existe. */
export async function articuloDesdeCatalogo(c: Db, tenantId: string, localId: string, catalogId: string, demo = false): Promise<string> {
  const ex = await one<{ id: string }>(c, "select id from articulos where local_id = $1 and catalog_item_id = $2 and not archived limit 1", [localId, catalogId]);
  if (ex) return ex.id;
  const { items } = await getCatalog();
  const it = items.find((i) => i.id === catalogId);
  if (!it) throw new Error("Elemento de catálogo desconocido");
  const byName = await one<{ id: string }>(c, "select id from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [localId, it.name]);
  if (byName) {
    await c.query("update articulos set catalog_item_id = coalesce(catalog_item_id, $2) where id = $1", [byName.id, catalogId]);
    return byName.id;
  }
  const iva = await ivaCategoria(it.category_id);
  const r = await one<{ id: string }>(c, `insert into articulos (tenant_id, local_id, name, category_id, catalog_item_id, unit, rend, iva, aliases, demo)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`, [tenantId, localId, it.name, it.category_id, it.id, it.unit, it.rend, iva, [], demo]);
  return r!.id;
}

export async function crearArticulo(c: Db, tenantId: string, localId: string, a: { name: string; categoryId: string; unit: BaseUnit; rend?: number; iva?: number; catalogId?: string | null; demo?: boolean }): Promise<string> {
  const name = a.name.trim().slice(0, 100);
  const dup = await one<{ id: string }>(c, "select id from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [localId, name]);
  if (dup) return dup.id;
  const iva = a.iva ?? await ivaCategoria(a.categoryId);
  const r = await one<{ id: string }>(c, `insert into articulos (tenant_id, local_id, name, category_id, catalog_item_id, unit, rend, iva, demo)
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [tenantId, localId, name, a.categoryId, a.catalogId ?? null, a.unit, Math.min(100, Math.max(1, a.rend ?? 100)), iva, !!a.demo]);
  return r!.id;
}

/** Guarda el texto del albarán como alias del artículo: la próxima vez se reconoce solo. */
export async function aprenderAlias(c: Db, articuloId: string, texto: string) {
  const t = norm(texto).slice(0, 120);
  if (!t) return;
  await c.query("update articulos set aliases = array_append(aliases, $2) where id = $1 and not ($2 = any(aliases)) and cardinality(aliases) < 40", [articuloId, t]);
}

/** Recalcula stock, PMP y última compra de un artículo a partir de sus movimientos y líneas de compra. */
export async function rebuildArticulo(c: Db, articuloId: string) {
  const movs = await all<{ cantidad: number; coste_unit: number | null; tipo: string; fecha: Date }>(c,
    "select cantidad, coste_unit, tipo, fecha from stock_movimientos where articulo_id = $1 order by fecha, id", [articuloId]);
  const r = replay(movs.map((m) => ({ cantidad: m.cantidad, costeUnit: m.coste_unit, tipo: m.tipo, fecha: m.fecha })));
  const last = await one<{ coste_unit: number; proveedor_id: string | null; fecha: string }>(c, `select cl.coste_unit, d.proveedor_id, d.fecha
    from compra_lineas cl join documentos d on d.id = cl.documento_id
    where cl.articulo_id = $1 and d.status = 'guardado' order by d.fecha desc nulls last, d.saved_at desc limit 1`, [articuloId]);
  await c.query(`update articulos set stock = $2, pmp = $3, last_price = $4, last_proveedor_id = $5, last_purchase_at = $6, updated_at = now() where id = $1`,
    [articuloId, r.stock, r.pmp, last?.coste_unit ?? null, last?.proveedor_id ?? null, last ? new Date(last.fecha + "T12:00:00Z") : null]);
}

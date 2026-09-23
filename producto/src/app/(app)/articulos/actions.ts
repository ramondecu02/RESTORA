"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { setFlash } from "@/server/session";
import { recomputeCosts } from "@/server/domain/costs";
import { articuloDesdeCatalogo, crearArticulo, ivaCategoria, rebuildArticulo } from "@/server/domain/articulos";
import { getCatalog } from "@/server/queries/catalog";
import { parseNum } from "@/lib/format";
import type { BaseUnit } from "@/lib/units";

const UNITS: BaseUnit[] = ["kg", "L", "ud"];

export async function crearArticuloAction(input: { name: string; categoryId: string; unit: BaseUnit; rend: number; precio: number | null; catalogId: string | null; stockMin: number | null; consumo: number | null; stock: number | null }): Promise<Result<{ id: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    const { cats } = await getCatalog();
    if (!cats.some((c) => c.id === input.categoryId)) throw new UserError("Elige el tipo de artículo.");
    if (!UNITS.includes(input.unit)) throw new UserError("Elige la unidad.");
    const name = input.name.trim();
    if (name.length < 2) throw new UserError("Escribe el nombre del artículo.");
    const id = await withTenant(ctx.tenantId, async (c) => {
      const dup = await one(c, "select 1 from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, name]);
      if (dup) throw new UserError("Ya tienes un artículo con ese nombre.");
      const id = input.catalogId ? await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, input.catalogId) : await crearArticulo(c, ctx.tenantId, ctx.local.id, { name, categoryId: input.categoryId, unit: input.unit, rend: input.rend });
      if (input.catalogId) await c.query("update articulos set name = $2, rend = $3 where id = $1", [id, name, Math.min(100, Math.max(1, input.rend || 100))]);
      await c.query(`update articulos set precio_manual = $2, precio_manual_at = case when $2::numeric is null then null else now() end, stock_min = $3, consumo_semanal = $4,
        track_stock = ($3::numeric is not null or $5::numeric is not null) where id = $1`, [id, input.precio, input.stockMin, input.consumo, input.stock]);
      if (input.stock != null && input.stock > 0) {
        await c.query(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, nota, created_by) values ($1,$2,$3,'inicial',$4,$5,'Stock inicial',$6)`,
          [ctx.tenantId, ctx.local.id, id, input.stock, input.precio, ctx.userId]);
        await rebuildArticulo(c, id);
      }
      await audit(c, ctx.tenantId, ctx.userId, "crear", "articulo", id, { name });
      return id;
    });
    return { ok: true, data: { id } };
  });
}

export async function guardarArticulo(id: string, f: { name: string; categoryId: string; unit: BaseUnit; rend: number; iva: number; precioManual: number | null; stockMin: number | null; consumo: number | null; trackStock: boolean; aliases: string[] }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(id)) throw new UserError("Artículo no válido.");
    const { cats } = await getCatalog();
    if (!cats.some((c) => c.id === f.categoryId)) throw new UserError("Tipo no válido.");
    if (!UNITS.includes(f.unit)) throw new UserError("Unidad no válida.");
    if (f.name.trim().length < 2) throw new UserError("El nombre es demasiado corto.");
    if (!(f.rend > 0 && f.rend <= 100)) throw new UserError("El aprovechable va de 1 a 100 %.");
    await withTenant(ctx.tenantId, async (c) => {
      const cur = await one<{ unit: string; precio_manual: number | null }>(c, "select unit, precio_manual from articulos where id = $1 and local_id = $2", [id, ctx.local.id]);
      if (!cur) throw new UserError("Artículo no encontrado.");
      if (cur.unit !== f.unit) {
        const used = await one(c, "select 1 from compra_lineas where articulo_id = $1 union all select 1 from receta_lineas where articulo_id = $1 limit 1", [id]);
        if (used) throw new UserError("No se puede cambiar la unidad: ya hay compras o recetas con este artículo.");
      }
      const manualChanged = (cur.precio_manual ?? null) !== (f.precioManual ?? null);
      await c.query(`update articulos set name = $2, category_id = $3, unit = $4, rend = $5, iva = $6, precio_manual = $7,
        precio_manual_at = case when $8 then (case when $7::numeric is null then null else now() end) else precio_manual_at end,
        stock_min = $9, consumo_semanal = $10, track_stock = $11, aliases = $12, updated_at = now() where id = $1`,
        [id, f.name.trim().slice(0, 100), f.categoryId, f.unit, f.rend, Math.round(f.iva), f.precioManual, manualChanged, f.stockMin, f.consumo, f.trackStock, f.aliases.slice(0, 40)]);
      await recomputeCosts(c, ctx.local.id);
      await audit(c, ctx.tenantId, ctx.userId, "editar", "articulo", id, {});
    });
    refresh();
    return { ok: true, msg: "Artículo guardado" };
  });
}

export async function archivarArticulo(id: string): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    await withTenant(ctx.tenantId, async (c) => {
      const used = await all<{ name: string }>(c, "select distinct r.name from receta_lineas l join recetas r on r.id = l.receta_id where l.articulo_id = $1 and not r.archived limit 3", [id]);
      if (used.length) throw new UserError(`Se usa en ${used.map((u) => u.name).join(", ")}. Quítalo de esas recetas antes de borrarlo.`);
      await c.query("update articulos set archived = true, track_stock = false where id = $1 and local_id = $2", [id, ctx.local.id]);
      await audit(c, ctx.tenantId, ctx.userId, "archivar", "articulo", id, {});
    });
  });
  if (r.ok) { await setFlash("Artículo borrado de tu lista."); redirect("/articulos"); }
  return r;
}

export async function cambiarProveedor(articuloId: string, proveedorId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    await withTenant(ctx.tenantId, async (c) => {
      const ap = await one<{ precio_unit: number }>(c, "select ap.precio_unit from articulo_proveedor ap join articulos a on a.id = ap.articulo_id where ap.articulo_id = $1 and ap.proveedor_id = $2 and a.local_id = $3", [articuloId, proveedorId, ctx.local.id]);
      if (!ap || ap.precio_unit == null) throw new UserError("No hay precio de ese proveedor para este artículo.");
      await c.query("update articulos set proveedor_pref_id = $2, precio_manual = $3, precio_manual_at = now(), updated_at = now() where id = $1", [articuloId, proveedorId, ap.precio_unit]);
      await recomputeCosts(c, ctx.local.id);
      await audit(c, ctx.tenantId, ctx.userId, "cambiar_proveedor", "articulo", articuloId, { proveedorId });
    });
    refresh();
    return { ok: true, msg: "Proveedor cambiado. Tus escandallos ya usan el nuevo precio." };
  });
}

export async function guardarCotizacion(articuloId: string, input: { proveedorId: string | null; proveedorNuevo: string; precio: number; unidad: string; nota: string }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    if (!(input.precio > 0)) throw new UserError("Pon un precio válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const a = await one(c, "select 1 from articulos where id = $1 and local_id = $2", [articuloId, ctx.local.id]);
      if (!a) throw new UserError("Artículo no encontrado.");
      let prov = input.proveedorId;
      if (!prov) {
        const n = input.proveedorNuevo.trim();
        if (n.length < 2) throw new UserError("Elige o escribe el proveedor.");
        const ex = await one<{ id: string }>(c, "select id from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, n]);
        prov = ex?.id ?? (await one<{ id: string }>(c, "insert into proveedores (tenant_id, local_id, name, origen) values ($1,$2,$3,'manual') returning id", [ctx.tenantId, ctx.local.id, n.slice(0, 80)]))!.id;
      }
      const cur = await one<{ origen: string }>(c, "select origen from articulo_proveedor where articulo_id = $1 and proveedor_id = $2", [articuloId, prov]);
      if (cur?.origen === "albaran") throw new UserError("Ya tienes compras de este proveedor: su precio sale de los albaranes.");
      await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, origen, nota)
        values ($1,$2,$3,$4,1,$5,$5,current_date,'cotizacion',$6)
        on conflict (articulo_id, proveedor_id) do update set precio = excluded.precio, precio_unit = excluded.precio_unit, fecha = current_date, nota = excluded.nota, unidad_compra = excluded.unidad_compra`,
        [ctx.tenantId, articuloId, prov, input.unidad.slice(0, 20), input.precio, input.nota.slice(0, 120)]);
    });
    refresh();
    return { ok: true, msg: "Comparativa añadida" };
  });
}

export async function quitarCotizacion(articuloId: string, proveedorId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    await withTenant(ctx.tenantId, (c) => c.query("delete from articulo_proveedor ap using articulos a where a.id = ap.articulo_id and a.local_id = $3 and ap.articulo_id = $1 and ap.proveedor_id = $2 and ap.origen = 'cotizacion'", [articuloId, proveedorId, ctx.local.id]));
    refresh();
  });
}

export async function precioRapido(articuloId: string, valor: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    const p = parseNum(valor);
    if (p == null || p < 0) throw new UserError("Precio no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      await c.query("update articulos set precio_manual = $2, precio_manual_at = now() where id = $1 and local_id = $3", [articuloId, p, ctx.local.id]);
      await recomputeCosts(c, ctx.local.id);
    });
    refresh();
  });
}

export async function ivaDeCategoria(categoryId: string): Promise<number> { return ivaCategoria(categoryId); }

"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { setFlash } from "@/server/session";
import { recomputeCosts } from "@/server/domain/costs";
import { crearArticulo, ivaCategoria, rebuildArticulo } from "@/server/domain/articulos";
import { getCatalog } from "@/server/queries/catalog";
import { parseNum } from "@/lib/format";
import { numValido } from "@/lib/inventory";
import { compatible, type BaseUnit, type LineUnit } from "@/lib/units";
import { margenDesdePvp } from "@/lib/receta-edit";
import { cantidadPorVenta, familiaReventa, ventasPorUnidad, type Servido } from "@/lib/venta-articulo";

const UNITS: BaseUnit[] = ["kg", "L", "ud"];
const IVAS = [0, 4, 5, 10, 21];
const MAX_PRECIO = 1e6;
/** Precio opcional (€/unidad base): vacío o un número finito no negativo. */
const precioOk = (p: unknown) => p == null || numValido(p, MAX_PRECIO);
const cantidadOk = (n: unknown) => n == null || numValido(n);

export async function crearArticuloAction(input: { name: string; categoryId: string; unit: BaseUnit; rend: number; precio: number | null; catalogId: string | null; stockMin: number | null; consumo: number | null; stock: number | null }): Promise<Result<{ id: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    const { cats } = await getCatalog();
    if (!cats.some((c) => c.id === input.categoryId)) throw new UserError("Elige el tipo de artículo.");
    if (!UNITS.includes(input.unit)) throw new UserError("Elige la unidad.");
    const name = String(input.name ?? "").trim();
    if (name.length < 2) throw new UserError("Escribe el nombre del artículo.");
    if (!(input.rend > 0 && input.rend <= 100)) throw new UserError("El aprovechable va de 1 a 100 %.");
    if (!precioOk(input.precio)) throw new UserError("Revisa el precio: no puede ser negativo.");
    if (!cantidadOk(input.stock) || !cantidadOk(input.stockMin) || !cantidadOk(input.consumo)) throw new UserError("Revisa el stock, el mínimo y el consumo: no pueden ser negativos.");
    // Del catálogo solo se toma el enlace (referencia de precios y reconocimiento en albaranes); tipo, unidad y aprovechable son los del formulario
    let catalogId: string | null = null;
    if (input.catalogId != null) {
      const it = (await getCatalog()).items.find((i) => i.id === input.catalogId);
      if (!it) throw new UserError("Ese producto ya no está en el catálogo.");
      if (it.unit !== input.unit) throw new UserError(`${it.name} del catálogo se mide en ${it.unit}. Para medirlo en ${input.unit}, escribe el nombre sin elegir la sugerencia.`);
      catalogId = it.id;
    }
    const id = await withTenant(ctx.tenantId, async (c) => {
      const dup = await one(c, "select 1 from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, name]);
      if (dup) throw new UserError("Ya tienes un artículo con ese nombre.");
      // Crear nunca modifica un artículo que ya existe
      const ya = catalogId ? await one<{ name: string }>(c, "select name from articulos where local_id = $1 and catalog_item_id = $2 and not archived limit 1", [ctx.local.id, catalogId]) : null;
      if (ya) throw new UserError(`Ya tienes este producto como «${ya.name}».`);
      const id = await crearArticulo(c, ctx.tenantId, ctx.local.id, { name, categoryId: input.categoryId, unit: input.unit, rend: input.rend, catalogId });
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

export type ArtCampos = { name: string; categoryId: string; unit: BaseUnit; rend: number; iva: number; precioManual: number | null; stockMin: number | null; consumo: number | null; trackStock: boolean };

/** Guarda solo los campos que ha cambiado el usuario (y los alias que ha quitado): lo que otros hayan cambiado mientras tanto
 *  (alias e IVA aprendidos de albaranes, mínimos del inventario, precio de un cambio de proveedor) no se pisa. */
export async function guardarArticulo(id: string, p: Partial<ArtCampos> & { quitarAliases?: string[] }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(id)) throw new UserError("Artículo no válido.");
    if (!p || typeof p !== "object") throw new UserError("Nada que guardar.");
    const { cats } = await getCatalog();
    if (p.categoryId !== undefined && !cats.some((c) => c.id === p.categoryId)) throw new UserError("Tipo no válido.");
    if (p.unit !== undefined && !UNITS.includes(p.unit)) throw new UserError("Unidad no válida.");
    if (p.name !== undefined && String(p.name).trim().length < 2) throw new UserError("El nombre es demasiado corto.");
    if (p.rend !== undefined && !(p.rend > 0 && p.rend <= 100)) throw new UserError("El aprovechable va de 1 a 100 %.");
    if (p.precioManual !== undefined && !precioOk(p.precioManual)) throw new UserError("Revisa el precio: no puede ser negativo.");
    if ((p.stockMin !== undefined && !cantidadOk(p.stockMin)) || (p.consumo !== undefined && !cantidadOk(p.consumo))) throw new UserError("Revisa el mínimo y el consumo: no pueden ser negativos.");
    if (p.trackStock !== undefined && typeof p.trackStock !== "boolean") throw new UserError("Valor no válido.");
    const quitar = Array.isArray(p.quitarAliases) ? p.quitarAliases.filter((x) => typeof x === "string").slice(0, 40) : [];
    await withTenant(ctx.tenantId, async (c) => {
      const cur = await one<{ unit: string; precio_manual: number | null; iva: number }>(c, "select unit, precio_manual, iva from articulos where id = $1 and local_id = $2 and not archived for update", [id, ctx.local.id]);
      if (!cur) throw new UserError("Artículo no encontrado.");
      if (p.unit !== undefined && cur.unit !== p.unit) {
        const used = await one(c, "select 1 from compra_lineas where articulo_id = $1 union all select 1 from receta_lineas where articulo_id = $1 limit 1", [id]);
        if (used) throw new UserError("No se puede cambiar la unidad: ya hay compras o recetas con este artículo.");
      }
      if (p.iva !== undefined && p.iva !== cur.iva && !IVAS.includes(p.iva)) throw new UserError("IVA no válido.");
      const sets: string[] = [];
      const vals: unknown[] = [id];
      const put = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); return `$${vals.length}`; };
      if (p.name !== undefined) put("name", String(p.name).trim().slice(0, 100));
      if (p.categoryId !== undefined) put("category_id", p.categoryId);
      if (p.unit !== undefined) put("unit", p.unit);
      if (p.rend !== undefined) put("rend", p.rend);
      if (p.iva !== undefined) put("iva", p.iva);
      if (p.precioManual !== undefined && (cur.precio_manual ?? null) !== (p.precioManual ?? null)) {
        const v = put("precio_manual", p.precioManual);
        sets.push(`precio_manual_at = case when ${v}::numeric is null then null else now() end`);
      }
      if (p.stockMin !== undefined) put("stock_min", p.stockMin);
      if (p.consumo !== undefined) put("consumo_semanal", p.consumo);
      if (p.trackStock !== undefined) put("track_stock", p.trackStock);
      if (quitar.length) { vals.push(quitar); sets.push(`aliases = array(select x from unnest(aliases) with ordinality as t(x, i) where not (x = any($${vals.length}::text[])) order by i)`); }
      if (!sets.length) return;
      await c.query(`update articulos set ${sets.join(", ")}, updated_at = now() where id = $1`, vals);
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
    if (!isUuid(articuloId) || !isUuid(proveedorId)) throw new UserError("Proveedor no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const ap = await one<{ precio_unit: number }>(c, `select ap.precio_unit from articulo_proveedor ap join articulos a on a.id = ap.articulo_id
        join proveedores p on p.id = ap.proveedor_id and p.local_id = a.local_id and not p.archived where ap.articulo_id = $1 and ap.proveedor_id = $2 and a.local_id = $3`, [articuloId, proveedorId, ctx.local.id]);
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
    if (!(input.precio > 0) || !numValido(input.precio, MAX_PRECIO)) throw new UserError("Pon un precio válido.");
    if (!isUuid(articuloId)) throw new UserError("Artículo no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const a = await one<{ proveedor_pref_id: string | null; precio_manual: number | null }>(c, "select proveedor_pref_id, precio_manual from articulos where id = $1 and local_id = $2 for update", [articuloId, ctx.local.id]);
      if (!a) throw new UserError("Artículo no encontrado.");
      let prov = input.proveedorId;
      if (prov) {
        if (!isUuid(prov) || !(await one(c, "select 1 from proveedores where id = $1 and local_id = $2 and not archived", [prov, ctx.local.id]))) throw new UserError("Proveedor no válido.");
      } else {
        const n = input.proveedorNuevo.trim();
        if (n.length < 2) throw new UserError("Elige o escribe el proveedor.");
        const ex = await one<{ id: string }>(c, "select id from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, n]);
        prov = ex?.id ?? (await one<{ id: string }>(c, "insert into proveedores (tenant_id, local_id, name, origen) values ($1,$2,$3,'manual') returning id", [ctx.tenantId, ctx.local.id, n.slice(0, 80)]))!.id;
      }
      const cur = await one<{ origen: string; precio_unit: number | null }>(c, "select origen, precio_unit from articulo_proveedor where articulo_id = $1 and proveedor_id = $2", [articuloId, prov]);
      if (cur?.origen === "albaran") throw new UserError("Ya tienes compras de este proveedor: su precio sale de los albaranes.");
      await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, origen, nota)
        values ($1,$2,$3,$4,1,$5,$5,current_date,'cotizacion',$6)
        on conflict (articulo_id, proveedor_id) do update set precio = excluded.precio, precio_unit = excluded.precio_unit, fecha = current_date, nota = excluded.nota, unidad_compra = excluded.unidad_compra`,
        [ctx.tenantId, articuloId, prov, String(input.unidad ?? "").slice(0, 20), input.precio, String(input.nota ?? "").slice(0, 120)]);
      // Si es el proveedor actual y el precio del artículo salía de esta cotización, el artículo y los escandallos pasan al nuevo precio
      if (a.proveedor_pref_id === prov && cur?.precio_unit != null && a.precio_manual != null && Math.abs(a.precio_manual - cur.precio_unit) < 1e-6) {
        await c.query("update articulos set precio_manual = $2, precio_manual_at = now(), updated_at = now() where id = $1", [articuloId, input.precio]);
        await recomputeCosts(c, ctx.local.id);
      }
    });
    refresh();
    return { ok: true, msg: "Comparativa añadida" };
  });
}

export async function quitarCotizacion(articuloId: string, proveedorId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    if (!isUuid(articuloId) || !isUuid(proveedorId)) throw new UserError("Proveedor no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const del = await one<{ precio_unit: number | null }>(c, "delete from articulo_proveedor ap using articulos a where a.id = ap.articulo_id and a.local_id = $3 and ap.articulo_id = $1 and ap.proveedor_id = $2 and ap.origen = 'cotizacion' returning ap.precio_unit", [articuloId, proveedorId, ctx.local.id]);
      if (!del) return;
      // Si era el proveedor actual, deja de serlo; y si el precio del artículo salía de esa cotización, se quita (vuelve el de las compras)
      const a = await one<{ precio_manual: number | null }>(c, "select precio_manual from articulos where id = $1 and proveedor_pref_id = $2 for update", [articuloId, proveedorId]);
      if (!a) return;
      const deCotizacion = del.precio_unit != null && a.precio_manual != null && Math.abs(a.precio_manual - del.precio_unit) < 1e-6;
      await c.query(`update articulos set proveedor_pref_id = null, precio_manual = case when $2 then null else precio_manual end,
        precio_manual_at = case when $2 then null else precio_manual_at end, updated_at = now() where id = $1`, [articuloId, deCotizacion]);
      if (deCotizacion) await recomputeCosts(c, ctx.local.id);
    });
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

const LINE_UNITS: LineUnit[] = ["g", "kg", "ml", "L", "ud"];

/**
 * Precio de venta de un artículo que se vende tal cual (vino, cerveza, agua…). Crea, o actualiza, el producto de reventa enlazado a él:
 * así el margen sale del precio de compra del propio artículo y aparece también en Ventas y en la carta, sin dar de alta nada dos veces.
 * Lo que se sirve en cada venta: en artículos que se miden en «ud» (cajas, barriles), `porUnidad` = cuántas ventas salen de cada unidad
 * comprada (una caja de 24 → 24); en kg o L, `cantidad` + `unidad` (330 ml). Si no vienen, se mantiene lo que ya había.
 */
export async function fijarVentaArticulo(id: string, v: { pvp: number | null; cantidad?: number | null; unidad?: LineUnit | null; porUnidad?: number | null }): Promise<Result<{ recetaId: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    requirePerm(ctx, "carta:precios");
    if (!isUuid(id)) throw new UserError("Artículo no válido.");
    if (!v || typeof v !== "object") throw new UserError("Datos no válidos.");
    const pvp = v.pvp == null ? null : v.pvp;
    if (pvp != null && !(typeof pvp === "number" && Number.isFinite(pvp) && pvp > 0 && pvp < 100000)) throw new UserError("Precio de venta no válido.");
    const cant = v.cantidad ?? null;
    if (cant != null && !(typeof cant === "number" && Number.isFinite(cant) && cant > 0 && cant < 1e6)) throw new UserError("Revisa cuánto se sirve en cada venta.");
    const por = v.porUnidad ?? null;
    if (por != null && !(typeof por === "number" && Number.isFinite(por) && por >= 0.01 && por <= 10000)) throw new UserError("Revisa cuántas ventas salen de cada unidad: de 0,01 a 10.000.");
    if (v.unidad != null && !LINE_UNITS.includes(v.unidad)) throw new UserError("Unidad no válida.");
    const recetaId = await withTenant(ctx.tenantId, async (c) => {
      const a = await one<{ name: string; unit: BaseUnit; category_id: string }>(c, "select name, unit, category_id from articulos where id = $1 and local_id = $2 and not archived for update", [id, ctx.local.id]);
      if (!a) throw new UserError("Artículo no encontrado.");
      const ya = await one<{ id: string; raciones: number; cantidad: number; unidad: LineUnit }>(c, `select r.id, r.raciones::float as raciones, l.cantidad::float as cantidad, l.unidad from recetas r join receta_lineas l on l.receta_id = r.id
        where l.articulo_id = $1 and r.local_id = $2 and r.reventa and r.tipo = 'plato' and not r.archived
          and (select count(*) from receta_lineas x where x.receta_id = r.id) = 1 order by r.updated_at desc limit 1 for update of r`, [id, ctx.local.id]);
      let serv: Servido;
      if (a.unit === "ud") {
        // Una unidad comprada (caja, barril, botella) y las ventas que salen de ella: el coste de cada venta es exacto, sin decimales de más
        const n = por ?? (ya ? ventasPorUnidad(ya) : 1);
        serv = { cantidad: 1, unidad: "ud", raciones: Math.round(n * 1000) / 1000 };
      } else {
        const unidad = v.unidad ?? (a.unit === "L" ? "ml" : "g");
        const base = cant != null ? { cantidad: cant, unidad } : ya ? { cantidad: cantidadPorVenta(ya), unidad: ya.unidad } : null;
        if (!base) throw new UserError(`Indica cuánto ${a.unit === "L" ? "(en cl o ml) " : ""}se sirve en cada venta: ${a.name} se mide en ${a.unit}.`);
        serv = { ...base, raciones: 1 };
      }
      if (!compatible(a.unit, serv.unidad)) throw new UserError("Esa unidad no encaja con el artículo (peso, volumen o unidades).");
      if (!ya && pvp == null) throw new UserError("Pon el precio de venta.");
      let rid = ya?.id;
      if (!rid) {
        const r = await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, raciones, rinde, rinde_unit, pvp, reventa, estado, en_carta)
          values ($1,$2,'plato',$3,$4,$5,1,'kg',$6,true,'activo',true) returning id`, [ctx.tenantId, ctx.local.id, a.name.slice(0, 100), familiaReventa(a.category_id), serv.raciones, pvp]);
        rid = r!.id;
        await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, cantidad, unidad) values ($1,$2,0,$3,$4,$5)", [ctx.tenantId, rid, id, serv.cantidad, serv.unidad]);
      } else {
        const igual = Math.abs(serv.cantidad - ya!.cantidad) < 1e-9 && serv.unidad === ya!.unidad && Math.abs(serv.raciones - ya!.raciones) < 1e-9;
        if (!igual) await c.query("update receta_lineas set cantidad = $2, unidad = $3 where receta_id = $1", [rid, serv.cantidad, serv.unidad]);
        await c.query("update recetas set pvp = $2, raciones = $3, updated_at = now() where id = $1", [rid, pvp, serv.raciones]);
      }
      const costes = await recomputeCosts(c, ctx.local.id);
      // Mismo criterio que el resto de la reventa: el margen objetivo es el real con ese PVP, redondeado hacia abajo
      const coste = costes.get(rid);
      const margen = pvp != null && coste != null && coste > 0 ? margenDesdePvp(coste, pvp, ctx.local.iva_venta) : null;
      await c.query("update recetas set margen_objetivo = $2 where id = $1", [rid, margen]);
      await audit(c, ctx.tenantId, ctx.userId, ya ? "guardar" : "crear", "receta", rid, { articulo: id, venta: true });
      return rid;
    });
    refresh();
    return { ok: true, data: { recetaId } };
  });
}

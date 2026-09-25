// Importación de ventas del TPV (CSV): líneas con coste congelado, alias recordados, stock y unidades al mes.
import { all, isUuid, one, withTenant, type Db } from "../db";
import { UserError, type AppCtx } from "../ctx";
import { audit } from "../audit";
import { explode, recetaCost } from "@/lib/costing";
import { norm } from "@/lib/fuzzy";
import { neto } from "@/lib/costing";
import { diasPeriodo, errorVentas, fechaIsoValida, type FilaVenta } from "@/lib/csv";
import { loadCostContext, recomputeCosts } from "./costs";
import { rebuildArticulo } from "./articulos";

export type ImportIn = {
  filename: string; fuente: string;
  /** Nombres del TPV; cada fila apunta a uno por su índice. */
  productos: string[]; filas: FilaVenta[];
  /** norm(nombre del TPV) → receta. */
  mapa: Record<string, string | null>;
  /** Periodo que indica el usuario cuando el archivo no trae fechas (o solo una). */
  desde?: string | null; hasta?: string | null;
  actualizarUds: boolean; descontarStock: boolean; comensales: number | null;
  /** Importar aunque ya haya ventas importadas de esas fechas. */
  forzar?: boolean;
};
export type ImportOut = { id: string; filas: number; total: number; sinAsignar: number; recetas: number; articulos: number; desde: string; hasta: string };
export type ImportRes = { ok: true; data: ImportOut } | { ok: false; error: string; solape: { filename: string; desde: string; hasta: string } };

export async function importarVentas(ctx: AppCtx, input: ImportIn): Promise<ImportRes> {
  if (!input || typeof input !== "object") throw new UserError("Datos no válidos.");
  const err = errorVentas(input.productos, input.filas);
  if (err) throw new UserError(err);
  const comensales = input.comensales ?? null;
  if (comensales !== null && !(typeof comensales === "number" && Number.isFinite(comensales) && comensales >= 0 && comensales < 1e7)) throw new UserError("Comensales no válidos.");
  // Periodo: el de las fechas del archivo, ampliado con el que indique el usuario. Sin ninguna fecha no se puede pasar a unidades al mes.
  const fechas = input.filas.map((f) => f[1]).filter((f): f is string => f != null).sort();
  let desde = fechas[0] ?? null, hasta = fechas[fechas.length - 1] ?? null;
  if (input.desde != null || input.hasta != null) {
    const d = input.desde, h = input.hasta;
    if (!fechaIsoValida(d) || !fechaIsoValida(h) || d > h) throw new UserError("Indica un periodo válido: la fecha de inicio no puede ser posterior a la de fin.");
    if (diasPeriodo(d, h) > 366) throw new UserError("El periodo no puede pasar de un año. Divide el archivo.");
    if (!desde || d < desde) desde = d;
    if (!hasta || h > hasta) hasta = h;
  }
  if (!desde || !hasta) throw new UserError("El archivo no trae fechas: indica qué periodo cubren estas ventas.");
  const dias = diasPeriodo(desde, hasta);
  const mapaIn: Record<string, unknown> = input.mapa && typeof input.mapa === "object" ? input.mapa : {};
  const filename = String(input.filename ?? "").slice(0, 120), fuente = String(input.fuente ?? "").slice(0, 40);

  return withTenant(ctx.tenantId, async (c): Promise<ImportRes> => {
    // Las ventas de unas fechas ya importadas contarían dos veces (y el stock se descontaría otra vez): se pregunta antes.
    if (input.forzar !== true) {
      const dup = await one<{ filename: string; desde: string; hasta: string }>(c, `select filename, desde, hasta from ventas_importes
        where local_id = $1 and not demo and desde <= $3 and hasta >= $2 order by created_at desc limit 1`, [ctx.local.id, desde, hasta]);
      if (dup) return { ok: false, error: "Ya hay ventas importadas de estas fechas.", solape: dup };
    }
    const { recetas, ctx: cc } = await loadCostContext(c, ctx.local.id);
    const valid = new Map(recetas.filter((r) => r.tipo !== "elaboracion").map((r) => [r.id, r]));
    // Solo cuentan las asignaciones de productos que vienen en el archivo, y a recetas de este local.
    const mapa = new Map<string, string>();
    for (const p of input.productos) {
      const k = norm(p), v = Object.prototype.hasOwnProperty.call(mapaIn, k) ? mapaIn[k] : null;
      if (isUuid(v) && valid.has(v)) mapa.set(k, v);
    }
    const imp = await one<{ id: string }>(c, `insert into ventas_importes (tenant_id, local_id, fuente, filename, desde, hasta, filas, total, comensales, created_by)
      values ($1,$2,$3,$4,$5,$6,0,0,$7,$8) returning id`, [ctx.tenantId, ctx.local.id, fuente, filename, desde, hasta, comensales == null ? null : Math.round(comensales), ctx.userId]);
    const unidadesPorReceta = new Map<string, number>();
    let total = 0, sinAsignar = 0;
    const costeCache = new Map<string, number>();
    const L: { fecha: string; nombre: string; receta: string; uds: number; importe: number; cu: number }[] = [];
    for (const [pi, fecha, u, i] of input.filas) {
      const nombre = input.productos[pi];
      const recId = mapa.get(norm(nombre));
      if (!recId) { sinAsignar++; continue; }
      if (!u && !i) continue;
      const rec = valid.get(recId)!;
      // Sin unidades en el archivo se sacan del importe con el PVP. Las devoluciones y anulaciones (negativas) restan.
      const uds = u != null ? u : i && rec.pvp ? Math.round((i / rec.pvp) * 100) / 100 : 0;
      const importe = i != null ? i : Math.round((rec.pvp ?? 0) * uds * 100) / 100;
      if (!costeCache.has(recId)) costeCache.set(recId, recetaCost(recId, cc).perUnit);
      L.push({ fecha: fecha ?? hasta, nombre: nombre.slice(0, 120), receta: recId, uds, importe, cu: costeCache.get(recId)! });
      unidadesPorReceta.set(recId, (unidadesPorReceta.get(recId) ?? 0) + uds);
      total += importe;
    }
    // Por tandas: un archivo de un año son decenas de miles de líneas.
    for (let k = 0; k < L.length; k += 1000) {
      const b = L.slice(k, k + 1000);
      await c.query(`insert into ventas_lineas (tenant_id, local_id, import_id, fecha, nombre, receta_id, unidades, importe, neto, coste_unit, coste_total)
        select $1::uuid, $2::uuid, $3::uuid, x.* from unnest($4::date[], $5::text[], $6::uuid[], $7::numeric[], $8::numeric[], $9::numeric[], $10::numeric[], $11::numeric[]) as x`,
        [ctx.tenantId, ctx.local.id, imp!.id, b.map((x) => x.fecha), b.map((x) => x.nombre), b.map((x) => x.receta), b.map((x) => x.uds), b.map((x) => x.importe),
          b.map((x) => neto(x.importe, ctx.local.iva_venta)), b.map((x) => x.cu), b.map((x) => x.cu * x.uds)]);
    }
    for (const [k, v] of mapa) {
      await c.query(`insert into ventas_alias (tenant_id, local_id, nombre_norm, receta_id) values ($1,$2,$3,$4)
        on conflict (local_id, nombre_norm) do update set receta_id = excluded.receta_id`, [ctx.tenantId, ctx.local.id, k.slice(0, 120), v]);
    }
    await c.query("update ventas_importes set filas = $2, total = $3 where id = $1", [imp!.id, L.length, Math.round(total * 100) / 100]);
    let articulos = 0;
    if (input.descontarStock === true) {
      // Un movimiento por artículo y día de venta: un recuento hecho a mitad del periodo no se ve afectado por lo vendido antes
      const porDia = new Map<string, Map<string, number>>();
      for (const l of L) { const m = porDia.get(l.fecha) ?? new Map<string, number>(); m.set(l.receta, (m.get(l.receta) ?? 0) + l.uds); porDia.set(l.fecha, m); }
      const tracked = new Set((await all<{ id: string }>(c, "select id from articulos where local_id = $1 and track_stock", [ctx.local.id])).map((a) => a.id));
      const tocados = new Set<string>();
      const movs: { aid: string; q: number; fecha: string }[] = [];
      for (const [fecha, recetas] of porDia) {
        const consumo = new Map<string, number>();
        for (const [recId, uds] of recetas) {
          if (uds <= 0) continue; // más devoluciones que ventas ese día: no se devuelve género al almacén
          // explode da cantidades netas (aprovechables); el stock está en lo comprado, así que se divide por el rendimiento.
          for (const [aid, q] of explode(recId, cc)) consumo.set(aid, (consumo.get(aid) ?? 0) + (q / (Math.max(1, cc.arts.get(aid)?.rend ?? 100) / 100)) * uds);
        }
        for (const [aid, q] of consumo) {
          const r = Math.round(q * 1000) / 1000;
          if (!tracked.has(aid) || r <= 0) continue;
          movs.push({ aid, q: -r, fecha });
          tocados.add(aid);
        }
      }
      for (let k = 0; k < movs.length; k += 1000) {
        const b = movs.slice(k, k + 1000);
        await c.query(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, ref_tipo, ref_id, fecha, nota, created_by)
          select $1::uuid, $2::uuid, x.a, 'venta', x.q, 'ventas', $3::uuid, (x.f + time '20:00') at time zone 'Europe/Madrid', 'Ventas importadas', $4::uuid
          from unnest($5::uuid[], $6::numeric[], $7::date[]) as x(a, q, f)`,
          [ctx.tenantId, ctx.local.id, imp!.id, ctx.userId, b.map((m) => m.aid), b.map((m) => m.q), b.map((m) => m.fecha)]);
      }
      for (const aid of tocados) await rebuildArticulo(c, aid);
      articulos = tocados.size;
      // Ventas con fecha pasada cambian el PMP de compras posteriores: la caché de coste de las recetas se rehace
      if (articulos) await recomputeCosts(c, ctx.local.id);
    }
    if (input.actualizarUds === true) {
      for (const [recId, uds] of unidadesPorReceta) await c.query("update recetas set ventas_mes = $2 where id = $1", [recId, Math.min(9_999_999, Math.max(0, Math.round((uds * 30) / dias)))]);
    }
    await audit(c, ctx.tenantId, ctx.userId, "importar", "ventas", imp!.id, { filas: L.length, total, sinAsignar, desde, hasta });
    return { ok: true, data: { id: imp!.id, filas: L.length, total, sinAsignar, recetas: unidadesPorReceta.size, articulos, desde, hasta } };
  });
}

export async function borrarImportacion(ctx: AppCtx, id: string) {
  await withTenant(ctx.tenantId, async (c: Db) => {
    const imp = await one(c, "select 1 from ventas_importes where id = $1 and local_id = $2", [id, ctx.local.id]);
    if (!imp) throw new UserError("Importación no encontrada.");
    const arts = (await all<{ articulo_id: string }>(c, "select distinct articulo_id from stock_movimientos where ref_id = $1", [id])).map((r) => r.articulo_id);
    await c.query("delete from stock_movimientos where ref_id = $1", [id]);
    await c.query("delete from ventas_importes where id = $1", [id]);
    for (const a of arts) await rebuildArticulo(c, a);
    if (arts.length) await recomputeCosts(c, ctx.local.id);
    await audit(c, ctx.tenantId, ctx.userId, "borrar", "ventas", id, {});
  });
}

// Guardado de recetas con validación de líneas, unidades y ciclos entre subrecetas.
import { all, one, type Db } from "../db";
import { UserError, type AppCtx } from "../ctx";
import { recetaCost } from "@/lib/costing";
import { compatible, type BaseUnit, type LineUnit } from "@/lib/units";
import { buildContext, loadArticulos, loadLineas, loadRecetas, recomputeCosts } from "./costs";

export type LineaIn = { articuloId?: string | null; subrecetaId?: string | null; cantidad: number; unidad: LineUnit };
export type RecetaIn = {
  name: string; familia: string; raciones: number; rinde: number; rindeUnit: BaseUnit; pvp: number | null; fcObjetivo: number | null; ventasMes: number;
  enCarta: boolean; estado: "borrador" | "activo"; descripcion: string; notas: string; costeManual: number | null; margenObjetivo: number | null;
  lineas: LineaIn[]; precios?: { articuloId: string; precio: number | null; rend: number }[];
};
const LU: LineUnit[] = ["g", "kg", "ml", "L", "ud"];
const num = (n: unknown, min = 0, max = 1e7) => (typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? n : null);

export async function validarLineas(c: Db, ctx: AppCtx, recetaId: string | null, tipo: string, lineas: LineaIn[]) {
  if (lineas.length > 80) throw new UserError("Demasiadas líneas en una receta.");
  const arts = new Map((await all<{ id: string; unit: BaseUnit }>(c, "select id, unit from articulos where local_id = $1 and not archived", [ctx.local.id])).map((a) => [a.id, a.unit]));
  const recs = new Map((await all<{ id: string; tipo: string; rinde_unit: BaseUnit }>(c, "select id, tipo, rinde_unit from recetas where local_id = $1 and not archived", [ctx.local.id])).map((r) => [r.id, r]));
  const out: { articuloId: string | null; subrecetaId: string | null; cantidad: number; unidad: LineUnit }[] = [];
  for (const l of lineas) {
    const q = num(l.cantidad, 0, 1e6);
    if (q == null) throw new UserError("Revisa las cantidades: hay alguna no válida.");
    if (!LU.includes(l.unidad)) throw new UserError("Unidad no válida.");
    if (l.articuloId) {
      const u = arts.get(l.articuloId);
      if (!u) throw new UserError("Hay un ingrediente que ya no existe. Quítalo y vuelve a añadirlo.");
      if (!compatible(u, l.unidad)) throw new UserError("Hay una unidad que no encaja con el ingrediente (peso, volumen o unidades).");
      out.push({ articuloId: l.articuloId, subrecetaId: null, cantidad: q, unidad: l.unidad });
    } else if (l.subrecetaId) {
      const r = recs.get(l.subrecetaId);
      if (!r || l.subrecetaId === recetaId) throw new UserError("Una receta no puede contenerse a sí misma.");
      if (tipo !== "menu" && r.tipo !== "elaboracion") throw new UserError("En un plato solo se pueden usar elaboraciones como subreceta.");
      const u: BaseUnit = r.tipo === "elaboracion" ? r.rinde_unit : "ud";
      if (!compatible(u, l.unidad)) throw new UserError("Hay una unidad que no encaja con la elaboración.");
      out.push({ articuloId: null, subrecetaId: l.subrecetaId, cantidad: q, unidad: l.unidad });
    }
  }
  return out;
}

export async function guardarRecetaTx(c: Db, ctx: AppCtx, id: string, input: RecetaIn) {
  const cur = await one<{ tipo: string; reventa: boolean }>(c, "select tipo, reventa from recetas where id = $1 and local_id = $2 and not archived for update", [id, ctx.local.id]);
  if (!cur) throw new UserError("Receta no encontrada.");
  const name = input.name.trim().slice(0, 100);
  if (name.length < 2) throw new UserError("Ponle un nombre.");
  const lineas = await validarLineas(c, ctx, id, cur.tipo, input.lineas);
  const raciones = num(input.raciones, 0.01, 10000) ?? 1;
  const rinde = num(input.rinde, 0.001, 1e6) ?? 1;
  const pvp = input.pvp == null ? null : num(input.pvp, 0, 100000);
  const fc = input.fcObjetivo == null ? null : num(input.fcObjetivo, 1, 95);
  const ventas = num(input.ventasMes, 0, 1e7) ?? 0;
  await c.query(`update recetas set name = $2, familia = $3, raciones = $4, rinde = $5, rinde_unit = $6, pvp = $7, fc_objetivo = $8, ventas_mes = $9, en_carta = $10,
    estado = $11, descripcion = $12, notas = $13, coste_manual = $14, margen_objetivo = $15, updated_at = now() where id = $1`,
    [id, name, input.familia.trim().slice(0, 40), raciones, rinde, ["kg", "L", "ud"].includes(input.rindeUnit) ? input.rindeUnit : "kg", pvp, fc, ventas, !!input.enCarta,
      input.estado === "activo" ? "activo" : "borrador", input.descripcion.slice(0, 400), input.notas.slice(0, 2000),
      input.costeManual == null ? null : num(input.costeManual, 0, 100000), input.margenObjetivo == null ? null : num(input.margenObjetivo, 0, 99)]);
  await c.query("delete from receta_lineas where receta_id = $1", [id]);
  let idx = 0;
  for (const l of lineas) {
    await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, subreceta_id, cantidad, unidad) values ($1,$2,$3,$4,$5,$6,$7)",
      [ctx.tenantId, id, idx++, l.articuloId, l.subrecetaId, l.cantidad, l.unidad]);
  }
  for (const p of input.precios ?? []) {
    const rend = num(p.rend, 1, 100);
    const precio = p.precio == null ? null : num(p.precio, 0, 100000);
    const a = await one<{ precio_manual: number | null; rend: number }>(c, "select precio_manual, rend from articulos where id = $1 and local_id = $2", [p.articuloId, ctx.local.id]);
    if (!a) continue;
    if (precio != null) await c.query("update articulos set precio_manual = $2, precio_manual_at = now() where id = $1", [p.articuloId, precio]);
    if (rend != null && rend !== a.rend) await c.query("update articulos set rend = $2 where id = $1", [p.articuloId, rend]);
  }
  // Comprobar ciclos con los datos ya guardados
  // Secuencial: una sola conexión (transacción) no admite consultas en paralelo
  const arts = await loadArticulos(c, ctx.local.id);
  const recs = await loadRecetas(c, ctx.local.id);
  const lins = await loadLineas(c, ctx.local.id);
  const cc = buildContext(arts, recs, lins);
  if (recetaCost(id, cc).cycle) throw new UserError("Esa combinación crea un bucle: una elaboración acaba conteniéndose a sí misma.");
  await recomputeCosts(c, ctx.local.id);
}

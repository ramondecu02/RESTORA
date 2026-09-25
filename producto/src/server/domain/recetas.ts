// Guardado de recetas con validación de líneas, unidades y ciclos entre subrecetas.
import { all, isUuid, one, type Db } from "../db";
import { hasPerm, UserError, type AppCtx } from "../ctx";
import { getCatalog } from "../queries/catalog";
import { recetaCost } from "@/lib/costing";
import { fusionReceta } from "@/lib/receta-edit";
import { compatible, lineUnitsFor, type BaseUnit, type LineUnit } from "@/lib/units";
import { articuloDesdeCatalogo } from "./articulos";
import { buildContext, loadArticulos, loadLineas, loadRecetas, recomputeCosts } from "./costs";

/** Línea de receta. catalogId: ingrediente del catálogo que aún no está en tus artículos; se crea al guardar, en la misma transacción. */
export type LineaIn = { articuloId?: string | null; subrecetaId?: string | null; catalogId?: string | null; cantidad: number; unidad: LineUnit };
export type CamposReceta = {
  name: string; familia: string; raciones: number; rinde: number; rindeUnit: BaseUnit; pvp: number | null; fcObjetivo: number | null; ventasMes: number;
  enCarta: boolean; estado: "borrador" | "activo"; descripcion: string; notas: string; costeManual: number | null; margenObjetivo: number | null;
};
export type RecetaIn = CamposReceta & {
  lineas: LineaIn[];
  /** Solo lo que el usuario cambió de cada artículo (precio de compra o aprovechable), que afecta a todas las recetas. */
  precios?: { articuloId?: string; catalogId?: string; precio?: number | null; rend?: number | null }[];
  /** La receta tal como la cargó el cliente: solo se escribe lo que cambió respecto a ella. */
  orig?: CamposReceta & { lineas: LineaIn[] };
};
const LU: LineUnit[] = ["g", "kg", "ml", "L", "ud"];
const RU: BaseUnit[] = ["kg", "L", "ud"];
const num = (n: unknown, min = 0, max = 1e7) => (typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? n : null);
const bad = (m: string): never => { throw new UserError(m); };
const opt = (v: unknown, min: number, max: number, m: string) => (v == null ? null : num(v, min, max) ?? bad(m));

const COL: Record<keyof CamposReceta, string> = {
  name: "name", familia: "familia", raciones: "raciones", rinde: "rinde", rindeUnit: "rinde_unit", pvp: "pvp", fcObjetivo: "fc_objetivo", ventasMes: "ventas_mes",
  enCarta: "en_carta", estado: "estado", descripcion: "descripcion", notas: "notas", costeManual: "coste_manual", margenObjetivo: "margen_objetivo",
};
const CAMPOS = Object.keys(COL) as (keyof CamposReceta)[];
/** Campos de precio de carta: solo los roles con «carta:precios». */
const PRECIOS: string[] = ["pvp", "fcObjetivo", "costeManual", "margenObjetivo"];
const NORM: { [K in keyof CamposReceta]: (v: unknown) => CamposReceta[K] } = {
  name: (v) => { const s = String(v ?? "").trim().slice(0, 100); return s.length < 2 ? bad("Ponle un nombre.") : s; },
  familia: (v) => String(v ?? "").trim().slice(0, 40),
  raciones: (v) => num(v, 0.01, 10000) ?? bad("Revisa las raciones."),
  rinde: (v) => num(v, 0.001, 1e6) ?? bad("Revisa cuánto rinde la receta."),
  rindeUnit: (v) => (RU.includes(v as BaseUnit) ? (v as BaseUnit) : bad("Unidad de rinde no válida.")),
  pvp: (v) => opt(v, 0, 100000, "Precio no válido."),
  fcObjetivo: (v) => opt(v, 1, 95, "Food cost objetivo no válido."),
  ventasMes: (v) => num(v, 0, 1e7) ?? bad("Unidades vendidas no válidas."),
  enCarta: (v) => !!v,
  estado: (v) => (v === "activo" ? "activo" : "borrador"),
  descripcion: (v) => String(v ?? "").slice(0, 400),
  notas: (v) => String(v ?? "").slice(0, 2000),
  costeManual: (v) => opt(v, 0, 100000, "Precio de compra no válido."),
  margenObjetivo: (v) => opt(v, 0, 99, "Margen no válido."),
};
const tupla = (l: LineaIn | null | undefined) => [l?.articuloId ?? null, l?.subrecetaId ?? null, l?.catalogId ?? null, l?.cantidad ?? null, l?.unidad ?? null];
const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

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
  if (!input || typeof input !== "object" || !Array.isArray(input.lineas)) throw new UserError("Datos no válidos.");
  if (input.lineas.length > 80) throw new UserError("Demasiadas líneas en una receta.");
  const precios = input.precios ?? [];
  if (!Array.isArray(precios) || precios.length > 80) throw new UserError("Demasiados cambios de precio de una vez.");
  const cur = await one<{ tipo: string; reventa: boolean; name: string; familia: string; raciones: number; rinde: number; rinde_unit: BaseUnit; pvp: number | null;
    fc_objetivo: number | null; ventas_mes: number; en_carta: boolean; estado: "borrador" | "activo"; descripcion: string; notas: string; coste_manual: number | null; margen_objetivo: number | null }>(c,
    `select tipo, reventa, name, familia, raciones, rinde, rinde_unit, pvp, fc_objetivo, ventas_mes, en_carta, estado, descripcion, notas, coste_manual, margen_objetivo
     from recetas where id = $1 and local_id = $2 and not archived for update`, [id, ctx.local.id]);
  if (!cur) throw new UserError("Receta no encontrada.");
  const curLineas = await all<{ articulo_id: string | null; subreceta_id: string | null; cantidad: number; unidad: LineUnit }>(c,
    "select articulo_id, subreceta_id, cantidad, unidad from receta_lineas where receta_id = $1 order by idx", [id]);

  // Fusión a tres bandas: lo guardado ahora (actual), lo que cargó el cliente (origen) y lo que envía (entrada).
  // Solo se escribe lo que el usuario cambió; si otra persona cambió lo mismo a la vez, se avisa en vez de pisarlo.
  const actual: Record<string, unknown> = {
    name: cur.name, familia: cur.familia, raciones: cur.raciones, rinde: cur.rinde, rindeUnit: cur.rinde_unit, pvp: cur.pvp, fcObjetivo: cur.fc_objetivo,
    ventasMes: cur.ventas_mes, enCarta: cur.en_carta, estado: cur.estado, descripcion: cur.descripcion, notas: cur.notas, costeManual: cur.coste_manual,
    margenObjetivo: cur.margen_objetivo, lineas: curLineas.map((l) => tupla({ articuloId: l.articulo_id, subrecetaId: l.subreceta_id, cantidad: l.cantidad, unidad: l.unidad })),
  };
  const o = input.orig && typeof input.orig === "object" && Array.isArray(input.orig.lineas) ? input.orig : null;
  const origen: Record<string, unknown> = o ? { ...Object.fromEntries(CAMPOS.map((k) => [k, o[k]])), lineas: o.lineas.map(tupla) } : actual;
  const entrada: Record<string, unknown> = { ...Object.fromEntries(CAMPOS.map((k) => [k, eq(input[k], origen[k]) ? origen[k] : NORM[k](input[k])])), lineas: input.lineas.map(tupla) };
  const { cambiados, conflictos } = fusionReceta(entrada, origen, actual);
  if (!hasPerm(ctx, "carta:precios") && cambiados.some((k) => PRECIOS.includes(k))) throw new UserError("Tu rol no cambia precios de carta.");
  if (!hasPerm(ctx, "ventas") && cambiados.includes("ventasMes")) throw new UserError("Tu rol no cambia las unidades vendidas.");
  if (conflictos.length) throw new UserError("Otra persona ha cambiado esta receta mientras la editabas. Recarga la página para ver sus cambios y vuelve a aplicar los tuyos.");

  // Las líneas de otros platos que usan esta elaboración están en g/kg, ml/L o ud: cambiar la unidad de rinde descuadraría su coste.
  if (cur.tipo === "elaboracion" && cambiados.includes("rindeUnit")) {
    const usan = await all<{ name: string }>(c, `select distinct r.name from receta_lineas l join recetas r on r.id = l.receta_id
      where l.subreceta_id = $1 and not r.archived and not (l.unidad = any($2)) order by r.name limit 3`, [id, lineUnitsFor(entrada.rindeUnit as BaseUnit)]);
    if (usan.length) throw new UserError(`No se puede cambiar la unidad de rinde: la usa${usan.length > 1 ? "n" : ""} ${usan.map((u) => u.name).join(", ")}. Quítala de ahí antes de cambiarla.`);
  }

  let finales: { articuloId: string | null }[] = curLineas.map((l) => ({ articuloId: l.articulo_id }));
  const deCatalogo = new Map<string, string>();
  if (cambiados.includes("lineas")) {
    const pend = (l: LineaIn) => !!l && !l.articuloId && !l.subrecetaId && !!l.catalogId;
    const catIds = [...new Set(input.lineas.filter(pend).map((l) => l.catalogId!))];
    if (catIds.length) {
      const { items } = await getCatalog();
      for (const cid of catIds) {
        if (typeof cid !== "string" || !items.some((i) => i.id === cid)) throw new UserError("Hay un ingrediente del catálogo que ya no existe. Quítalo y vuelve a añadirlo.");
        deCatalogo.set(cid, await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, cid));
      }
    }
    const lineas = await validarLineas(c, ctx, id, cur.tipo, input.lineas.map((l) => (pend(l) ? { ...l, articuloId: deCatalogo.get(l.catalogId!) } : l)));
    await c.query("delete from receta_lineas where receta_id = $1", [id]);
    let idx = 0;
    for (const l of lineas) {
      await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, subreceta_id, cantidad, unidad) values ($1,$2,$3,$4,$5,$6,$7)",
        [ctx.tenantId, id, idx++, l.articuloId, l.subrecetaId, l.cantidad, l.unidad]);
    }
    finales = lineas;
  }
  const campos = cambiados.filter((k): k is keyof CamposReceta => k !== "lineas");
  if (cambiados.length) {
    await c.query(`update recetas set ${[...campos.map((k, i) => `${COL[k]} = $${i + 2}`), "updated_at = now()"].join(", ")} where id = $1`, [id, ...campos.map((k) => entrada[k])]);
  }

  // Precio o aprovechable de artículos: solo los que siguen en la receta (un precio probado en una línea que luego quitaste no se aplica).
  const enReceta = new Set(finales.map((l) => l.articuloId).filter(Boolean));
  const porArt = new Map<string, { precio: number | null; rend: number | null }>();
  for (const p of precios) {
    if (!p || typeof p !== "object") continue;
    const aid = p.articuloId ?? (typeof p.catalogId === "string" ? deCatalogo.get(p.catalogId) : undefined);
    if (!isUuid(aid) || !enReceta.has(aid)) continue;
    porArt.set(aid, { precio: p.precio == null ? null : num(p.precio, 0, 100000), rend: p.rend == null ? null : num(p.rend, 1, 100) });
  }
  if (porArt.size) {
    const arts = await all<{ id: string; rend: number }>(c, "select id, rend from articulos where id = any($1::uuid[]) and local_id = $2 and not archived", [[...porArt.keys()], ctx.local.id]);
    for (const a of arts) {
      const p = porArt.get(a.id)!;
      if (p.precio != null) await c.query("update articulos set precio_manual = $2, precio_manual_at = now() where id = $1", [a.id, p.precio]);
      if (p.rend != null && p.rend !== a.rend) await c.query("update articulos set rend = $2 where id = $1", [a.id, p.rend]);
    }
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

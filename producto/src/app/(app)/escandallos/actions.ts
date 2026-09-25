"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { all, isUuid, one, withTenant } from "@/server/db";
import { hasPerm, requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { setFlash } from "@/server/session";
import { recomputeCosts } from "@/server/domain/costs";
import { articuloDesdeCatalogo } from "@/server/domain/articulos";
import { guardarRecetaTx, type RecetaIn } from "@/server/domain/recetas";
import { PLANTILLAS } from "@/lib/plantillas";
import { margenDesdePvp, pvpDesdeMargen } from "@/lib/receta-edit";
import type { BaseUnit } from "@/lib/units";

/** Número opcional dentro de un rango; si no es válido, error para el usuario (nada de negativos ni NaN en precios). */
const opt = (v: unknown, min: number, max: number, msg: string) => {
  if (v == null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new UserError(msg);
  return v;
};

export async function guardarReceta(id: string, input: RecetaIn): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!isUuid(id)) throw new UserError("Receta no válida.");
    if (!input || typeof input.name !== "string" || !Array.isArray(input.lineas)) throw new UserError("Datos no válidos.");
    if (input.precios?.length) requirePerm(ctx, "compras");
    await withTenant(ctx.tenantId, async (c) => {
      await guardarRecetaTx(c, ctx, id, input);
      await audit(c, ctx.tenantId, ctx.userId, "guardar", "receta", id, { lineas: input.lineas.length });
    });
    refresh();
    return { ok: true, msg: `Cambios aplicados a ${input.name.trim()}` };
  });
}

type Nueva = { tipo: "plato" | "elaboracion" | "menu"; reventa: boolean; name: string; familia: string; pvp: number | null; coste: number | null; margen: number | null; rinde: number | null; rindeUnit: BaseUnit; plantilla?: string | null };
export async function crearReceta(input: Nueva): Promise<Result<{ id: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!input || typeof input.name !== "string" || typeof input.familia !== "string") throw new UserError("Datos no válidos.");
    const name = input.name.trim();
    if (name.length < 2) throw new UserError("Ponle un nombre.");
    if (!["plato", "elaboracion", "menu"].includes(input.tipo)) throw new UserError("Tipo no válido.");
    const elab = input.tipo === "elaboracion", reventa = input.tipo === "plato" && input.reventa === true;
    const pvpIn = opt(input.pvp, 0, 100000, "Precio no válido.");
    const coste = opt(input.coste, 0, 100000, "Precio de compra no válido.");
    const margen = opt(input.margen, 0, 99, "El margen va de 0 a 99 %.");
    const rinde = elab ? opt(input.rinde, 0.001, 1e6, "Indica cuánto sale de la receta.") ?? 1 : 1;
    if (elab && !["kg", "L", "ud"].includes(input.rindeUnit)) throw new UserError("Unidad no válida.");
    // Los precios de carta (PVP, coste y margen de reventa) solo los ponen los roles con «carta:precios».
    const precios = hasPerm(ctx, "carta:precios") && !elab;
    const id = await withTenant(ctx.tenantId, async (c) => {
      const tpl = input.plantilla ? PLANTILLAS.find((p) => p.key === input.plantilla) : null;
      let pvp = precios ? pvpIn ?? tpl?.pvp ?? null : null;
      if (precios && reventa && coste != null && margen != null) pvp = pvpDesdeMargen(coste, margen, ctx.local.iva_venta);
      const r = await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, raciones, rinde, rinde_unit, pvp, reventa, coste_manual, margen_objetivo, estado, en_carta)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'borrador',$13) returning id`,
        [ctx.tenantId, ctx.local.id, input.tipo, name.slice(0, 100), input.familia.trim().slice(0, 40), tpl?.raciones ?? 1, rinde,
          elab ? input.rindeUnit : "kg", pvp, reventa, reventa && precios ? coste : null, reventa && precios ? margen : null, !elab]);
      if (tpl) {
        let idx = 0;
        for (const l of tpl.lineas) {
          const artId = await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, l.cat);
          await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, cantidad, unidad) values ($1,$2,$3,$4,$5,$6)", [ctx.tenantId, r!.id, idx++, artId, l.q, l.u]);
        }
      }
      await recomputeCosts(c, ctx.local.id);
      await audit(c, ctx.tenantId, ctx.userId, "crear", "receta", r!.id, { tipo: input.tipo, plantilla: input.plantilla ?? null });
      return r!.id;
    });
    return { ok: true, data: { id } };
  });
}

export async function duplicarReceta(id: string): Promise<Result> {
  const r = await run<string>(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!isUuid(id)) throw new UserError("Receta no válida.");
    const nid = await withTenant(ctx.tenantId, async (c) => {
      const r = await one<{ id: string }>(c, `insert into recetas (tenant_id, local_id, tipo, name, familia, raciones, rinde, rinde_unit, fc_objetivo, pvp, reventa, coste_manual, margen_objetivo, en_carta, estado, descripcion, notas)
        select tenant_id, local_id, tipo, name || ' (copia)', familia, raciones, rinde, rinde_unit, fc_objetivo, pvp, reventa, coste_manual, margen_objetivo, false, 'borrador', descripcion, notas
        from recetas where id = $1 and local_id = $2 and not archived returning id`, [id, ctx.local.id]);
      if (!r) throw new UserError("Receta no encontrada.");
      await c.query("insert into receta_lineas (tenant_id, receta_id, idx, articulo_id, subreceta_id, cantidad, unidad) select tenant_id, $2, idx, articulo_id, subreceta_id, cantidad, unidad from receta_lineas where receta_id = $1", [id, r.id]);
      await recomputeCosts(c, ctx.local.id);
      return r.id;
    });
    return { ok: true, data: nid };
  });
  if (r.ok) { await setFlash("Copia creada. Está fuera de la carta hasta que la actives."); redirect(`/escandallos/${r.data}`); }
  return r;
}

export async function archivarReceta(id: string): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    await withTenant(ctx.tenantId, async (c) => {
      const used = await all<{ name: string }>(c, "select distinct r.name from receta_lineas l join recetas r on r.id = l.receta_id where l.subreceta_id = $1 and not r.archived limit 3", [id]);
      if (used.length) throw new UserError(`Se usa en ${used.map((u) => u.name).join(", ")}. Quítala de ahí antes de borrarla.`);
      await c.query("update recetas set archived = true, en_carta = false where id = $1 and local_id = $2", [id, ctx.local.id]);
      await audit(c, ctx.tenantId, ctx.userId, "archivar", "receta", id, {});
    });
  });
  if (r.ok) { await setFlash("Receta borrada."); redirect("/escandallos"); }
  return r;
}

/** Cambios rápidos desde Ventas y Carta: unidades al mes y precios de reventa. */
export async function setVentasMes(id: string, ventas: number): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "ventas");
    if (!isUuid(id)) throw new UserError("Plato no válido.");
    if (!(typeof ventas === "number" && ventas >= 0 && ventas < 1e7)) throw new UserError("Unidades no válidas.");
    await withTenant(ctx.tenantId, (c) => c.query("update recetas set ventas_mes = $2 where id = $1 and local_id = $3", [id, Math.round(ventas), ctx.local.id]));
  });
}
export async function setReventa(id: string, v: { coste: number | null; margen: number | null; pvp: number | null }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "carta:precios");
    if (!isUuid(id) || !v || typeof v !== "object") throw new UserError("Producto no válido.");
    const coste = opt(v.coste, 0, 100000, "Precio de compra no válido.");
    // El margen llega calculado desde el PVP: si el PVP no cubre el coste sería negativo, y se deja en 0.
    const margen = v.margen == null ? null : Math.min(99, Math.max(0, opt(v.margen, -1e7, 1e7, "Margen no válido.")!));
    const pvp = opt(v.pvp, 0, 100000, "Precio no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const r = await c.query("update recetas set coste_manual = coalesce($2, coste_manual), margen_objetivo = $3, pvp = $4 where id = $1 and local_id = $5 and reventa and not archived",
        [id, coste, margen, pvp, ctx.local.id]);
      if (!r.rowCount) throw new UserError("Producto no encontrado.");
      await recomputeCosts(c, ctx.local.id);
      // El margen objetivo no puede quedar por encima del real con ese PVP: por redondeo, el producto saldría «fuera de objetivo».
      if (pvp != null && margen != null) {
        const x = await one<{ coste_cache: number | null }>(c, "select coste_cache from recetas where id = $1", [id]);
        const real = x?.coste_cache != null ? margenDesdePvp(x.coste_cache, pvp, ctx.local.iva_venta) : null;
        if (real != null && real < margen) await c.query("update recetas set margen_objetivo = $2 where id = $1", [id, real]);
      }
    });
  });
}
export async function setPvp(id: string, pvp: number | null): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "carta:precios");
    if (!isUuid(id)) throw new UserError("Plato no válido.");
    if (pvp != null && !(typeof pvp === "number" && pvp >= 0 && pvp < 100000)) throw new UserError("Precio no válido.");
    await withTenant(ctx.tenantId, (c) => c.query("update recetas set pvp = $2 where id = $1 and local_id = $3", [id, pvp, ctx.local.id]));
  });
}

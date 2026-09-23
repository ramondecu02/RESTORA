"use server";
import { redirect } from "next/navigation";
import { isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { setFlash } from "@/server/session";
import { recomputeCosts } from "@/server/domain/costs";
import { BEBIDAS } from "@/lib/briefing";

export type CartaItem = { nombre: string; familia: string; precio: number | null; descripcion: string; accion: "crear" | "actualizar" | "ignorar"; recetaId: string | null };

export async function importarCarta(docId: string, items: CartaItem[]): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    if (items.length > 300) throw new UserError("Demasiados platos de una vez.");
    const n = await withTenant(ctx.tenantId, async (c) => {
      const d = await one<{ status: string; kind: string }>(c, "select status, kind from documentos where id = $1 and local_id = $2 for update", [docId, ctx.local.id]);
      if (!d || d.kind !== "carta") throw new UserError("Documento no encontrado.");
      let creados = 0, actualizados = 0, orden = 0;
      for (const it of items) {
        const nombre = it.nombre.trim().slice(0, 100);
        const precio = it.precio != null && it.precio >= 0 && it.precio < 10000 ? Math.round(it.precio * 100) / 100 : null;
        if (it.accion === "ignorar" || nombre.length < 2) continue;
        if (it.accion === "actualizar" && it.recetaId && isUuid(it.recetaId)) {
          await c.query("update recetas set pvp = coalesce($2, pvp), familia = case when familia = '' then $3 else familia end, descripcion = case when descripcion = '' then $4 else descripcion end, en_carta = true where id = $1 and local_id = $5",
            [it.recetaId, precio, it.familia.slice(0, 40), it.descripcion.slice(0, 400), ctx.local.id]);
          actualizados++;
        } else {
          await c.query(`insert into recetas (tenant_id, local_id, tipo, name, familia, pvp, reventa, descripcion, en_carta, estado, orden) values ($1,$2,'plato',$3,$4,$5,$6,$7,true,'borrador',$8)`,
            [ctx.tenantId, ctx.local.id, nombre, it.familia.slice(0, 40), precio, BEBIDAS.has(it.familia), it.descripcion.slice(0, 400), orden++]);
          creados++;
        }
      }
      await c.query("update documentos set status = 'guardado', saved_at = now() where id = $1", [docId]);
      await recomputeCosts(c, ctx.local.id);
      await audit(c, ctx.tenantId, ctx.userId, "importar_carta", "documento", docId, { creados, actualizados });
      return { creados, actualizados };
    });
    await setFlash(`${n.creados ? `${n.creados} platos creados` : ""}${n.creados && n.actualizados ? " y " : ""}${n.actualizados ? `${n.actualizados} precios actualizados` : ""}. Añade los ingredientes para ver su coste.`);
  });
  if (r.ok) redirect("/carta");
  return r;
}

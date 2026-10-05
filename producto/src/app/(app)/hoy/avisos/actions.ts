"use server";
import { refresh } from "next/cache";
import { isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";

/**
 * Da un aviso de precio por resuelto o decide ignorarlo. Deja de contar en el menú, en Hoy y en la lista de abiertos
 * hasta que el precio de ese artículo vuelva a cambiar (entonces es otro aviso).
 */
export async function cerrarAviso(eventoId: string, estado: "resuelto" | "ignorado"): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!isUuid(eventoId) || (estado !== "resuelto" && estado !== "ignorado")) throw new UserError("Aviso no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      const ev = await one<{ id: string }>(c, "select pe.id from precio_eventos pe join articulos a on a.id = pe.articulo_id where pe.id = $1 and a.local_id = $2", [eventoId, ctx.local.id]);
      if (!ev) throw new UserError("Ese aviso ya no existe.");
      await c.query(`insert into avisos_estado (evento_id, tenant_id, estado, user_id) values ($1, $2, $3, $4)
        on conflict (evento_id) do update set estado = excluded.estado, user_id = excluded.user_id, created_at = now()`, [eventoId, ctx.tenantId, estado, ctx.userId]);
      await audit(c, ctx.tenantId, ctx.userId, estado === "resuelto" ? "aviso_resuelto" : "aviso_ignorado", "precio_evento", eventoId, {});
    });
    refresh();
    return { ok: true, msg: estado === "resuelto" ? "Aviso resuelto" : "Aviso ignorado" };
  });
}

/** Vuelve a abrir un aviso resuelto o ignorado. */
export async function reabrirAviso(eventoId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "escandallos");
    if (!isUuid(eventoId)) throw new UserError("Aviso no válido.");
    await withTenant(ctx.tenantId, async (c) => {
      await c.query("delete from avisos_estado where evento_id = $1", [eventoId]);
      await audit(c, ctx.tenantId, ctx.userId, "aviso_reabierto", "precio_evento", eventoId, {});
    });
    refresh();
    return { ok: true, msg: "Aviso reabierto" };
  });
}

"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { setFlash } from "@/server/session";

export type ProvInput = { name: string; empresa: string; tipo: string; cif: string; responsable: string; phone: string; email: string; direccion: string; entrega: string; notas: string };
const clean = (p: ProvInput) => ({
  name: p.name.trim().slice(0, 80), empresa: p.empresa.trim().slice(0, 120), tipo: p.tipo.trim().slice(0, 40), cif: p.cif.trim().toUpperCase().slice(0, 20),
  responsable: p.responsable.trim().slice(0, 80), phone: p.phone.trim().slice(0, 30), email: p.email.trim().toLowerCase().slice(0, 120),
  direccion: p.direccion.trim().slice(0, 200), entrega: p.entrega.trim().slice(0, 80), notas: p.notas.trim().slice(0, 400),
});

export async function guardarProveedor(id: string | null, input: ProvInput): Promise<Result<{ id: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    const p = clean(input);
    if (p.name.length < 2) throw new UserError("Pon un nombre comercial.");
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new UserError("Revisa el correo electrónico.");
    const newId = await withTenant(ctx.tenantId, async (c) => {
      const dup = await one<{ id: string }>(c, "select id from proveedores where local_id = $1 and lower(name) = lower($2) and not archived and ($3::uuid is null or id <> $3)", [ctx.local.id, p.name, id]);
      if (dup) throw new UserError("Ya tienes un proveedor con ese nombre.");
      const vals = [p.name, p.empresa, p.tipo, p.cif, p.responsable, p.phone, p.email, p.direccion, p.entrega, p.notas];
      if (id) {
        if (!isUuid(id)) throw new UserError("Proveedor no válido.");
        await c.query("update proveedores set name=$2, empresa=$3, tipo=$4, cif=$5, responsable=$6, phone=$7, email=$8, direccion=$9, entrega=$10, notas=$11 where id=$1 and local_id=$12", [id, ...vals, ctx.local.id]);
        await audit(c, ctx.tenantId, ctx.userId, "editar", "proveedor", id, {});
        return id;
      }
      const r = await one<{ id: string }>(c, `insert into proveedores (tenant_id, local_id, name, empresa, tipo, cif, responsable, phone, email, direccion, entrega, notas, origen)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'manual') returning id`, [ctx.tenantId, ctx.local.id, ...vals]);
      await audit(c, ctx.tenantId, ctx.userId, "crear", "proveedor", r!.id, {});
      return r!.id;
    });
    refresh();
    return { ok: true, data: { id: newId }, msg: id ? "Proveedor actualizado" : "Proveedor añadido" };
  });
}

export async function borrarProveedor(id: string): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "proveedores:editar");
    await withTenant(ctx.tenantId, async (c) => {
      const used = await one<{ docs: number; arts: number; precios: number }>(c, `select
        (select count(*)::int from documentos where proveedor_id = $1) as docs,
        (select count(*)::int from articulos where (last_proveedor_id = $1 or proveedor_pref_id = $1) and not archived) as arts,
        (select count(*)::int from articulo_proveedor where proveedor_id = $1) as precios`, [id]);
      if (used && (used.docs || used.arts || used.precios)) throw new UserError("Tiene albaranes, productos o precios guardados: no se puede borrar. Puedes dejar de usarlo sin más.");
      await c.query("delete from proveedores where id = $1 and local_id = $2", [id, ctx.local.id]);
      await audit(c, ctx.tenantId, ctx.userId, "borrar", "proveedor", id, {});
    });
  });
  if (r.ok) { await setFlash("Proveedor eliminado"); redirect("/proveedores"); }
  return r;
}

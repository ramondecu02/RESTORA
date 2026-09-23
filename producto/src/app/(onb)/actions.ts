"use server";
import { redirect } from "next/navigation";
import { all, one, sys, withTenant } from "@/server/db";
import { requireOnboarding, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { setFlash } from "@/server/session";
import { parseNum } from "@/lib/format";
import { COMPRAS, OBJ, PLATOS, ROLES_BRIEF, TIPOS, TPVS } from "@/lib/briefing";

export type Brief = { tipo: string; platos: string; compras: string; tpv: string; rol: string; objetivo: string };

export async function guardarBriefing(b: Brief, editar: boolean): Promise<Result> {
  return run(async () => {
    const { org } = await requireOnboarding();
    const clean: Brief = {
      tipo: TIPOS.includes(b.tipo) ? b.tipo : "", platos: PLATOS.includes(b.platos) ? b.platos : "",
      compras: COMPRAS.some((c) => c[0] === b.compras) ? b.compras : "", tpv: TPVS.includes(b.tpv) ? b.tpv : TPVS[0],
      rol: ROLES_BRIEF.some((r) => r[0] === b.rol) ? b.rol : "", objetivo: OBJ.some((o) => o[0] === b.objetivo) ? b.objetivo : "",
    };
    if (!clean.tipo || !clean.platos || !clean.compras || !clean.rol || !clean.objetivo) throw new UserError("Responde a todas las preguntas.");
    if (org.role !== "propietario" && !editar) throw new UserError("Solo el propietario puede cambiar el briefing del negocio.");
    await sys((c) => c.query("update organizations set briefing = $2 where id = $1", [org.id, JSON.stringify(clean)]));
    if (editar) { await setFlash("Briefing actualizado. Hoy se ordena según tu objetivo."); redirect("/hoy"); }
    redirect("/alta/local");
  });
}

export type LocalState = { error?: string; fields?: Record<string, string> } | undefined;
export async function guardarLocal(_: LocalState, f: FormData): Promise<LocalState> {
  const { org } = await requireOnboarding();
  const name = String(f.get("name") ?? "").trim() || org.name;
  const iva = Number(f.get("iva_venta")) === 21 ? 21 : 10;
  const fc = parseNum(f.get("fc_objetivo")) ?? 30;
  const com = parseNum(f.get("comensales_dia"));
  if (fc < 5 || fc > 80) return { fields: { fc_objetivo: "Pon un porcentaje entre 5 y 80." } };
  await withTenant(org.id, async (c) => {
    const cur = await one<{ id: string }>(c, "select id from locales order by created_at limit 1");
    const vals = [name.slice(0, 80), String(f.get("address") ?? "").trim().slice(0, 160), String(f.get("postal_code") ?? "").trim().slice(0, 10),
      String(f.get("ciudad") ?? "").trim().slice(0, 60), iva, fc, com != null && com > 0 ? Math.round(com) : null];
    if (cur) await c.query("update locales set name=$2, address=$3, postal_code=$4, ciudad=$5, iva_venta=$6, fc_objetivo=$7, comensales_dia=$8 where id=$1", [cur.id, ...vals]);
    else await c.query("insert into locales (tenant_id, name, address, postal_code, ciudad, iva_venta, fc_objetivo, comensales_dia) values ($1,$2,$3,$4,$5,$6,$7,$8)", [org.id, ...vals]);
  });
  redirect("/alta/proveedores");
}

export async function altaProveedor(nombre: string, tipo: string): Promise<Result<{ id: string; name: string; tipo: string }>> {
  return run(async () => {
    const { org } = await requireOnboarding();
    const n = nombre.trim();
    if (n.length < 2) throw new UserError("Escribe el nombre del proveedor.");
    return withTenant(org.id, async (c) => {
      const l = await one<{ id: string }>(c, "select id from locales order by created_at limit 1");
      if (!l) throw new UserError("Primero guarda tu local.");
      const dup = await one(c, "select 1 from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [l.id, n]);
      if (dup) throw new UserError("Ese proveedor ya está en la lista.");
      const p = await one<{ id: string }>(c, "insert into proveedores (tenant_id, local_id, name, tipo, origen) values ($1,$2,$3,$4,'alta') returning id", [org.id, l.id, n.slice(0, 80), tipo.slice(0, 40)]);
      return { ok: true as const, data: { id: p!.id, name: n, tipo } };
    });
  });
}

export async function quitarProveedorAlta(id: string): Promise<Result> {
  return run(async () => {
    const { org } = await requireOnboarding();
    await withTenant(org.id, (c) => c.query("delete from proveedores where id = $1 and origen = 'alta' and not exists (select 1 from documentos d where d.proveedor_id = proveedores.id)", [id]));
  });
}

export async function terminarAlta(): Promise<void> {
  const { org } = await requireOnboarding();
  await sys((c) => c.query("update organizations set onboarding_done_at = coalesce(onboarding_done_at, now()) where id = $1", [org.id]));
  redirect("/hoy?tour=1");
}

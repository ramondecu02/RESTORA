"use server";
import { redirect } from "next/navigation";
import { isUuid, one, sys, withTenant } from "@/server/db";
import { loadLocal, requireOnboarding, requirePerm, UserError } from "@/server/ctx";
import { fail, run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import type { Perm } from "@/server/rbac";
import { setFlash } from "@/server/session";
import { COMPRAS, OBJ, PLATOS, PROV_TIPOS, ROLES_BRIEF, TIPOS, TPVS } from "@/lib/briefing";
import { leerLocal } from "./alta/local/datos";

/** Acciones del alta guiada: el mismo permiso que la acción equivalente de la app y solo mientras el alta no está terminada
 *  (después, los cambios se hacen desde la app, que deja registro). */
async function enAlta(p: Perm) {
  const o = await requireOnboarding();
  requirePerm(o.org, p);
  if (o.org.onboardingDone) throw new UserError("El alta ya está terminada: haz este cambio desde la app.");
  return o;
}

export type Brief = { tipo: string; platos: string; compras: string; tpv: string; rol: string; objetivo: string };

/** El briefing es del negocio (ordena Hoy para todos): solo lo cambia el propietario, durante el alta o después. */
export async function guardarBriefing(b: Brief): Promise<Result> {
  return run(async () => {
    const { org } = await requireOnboarding();
    if (org.role !== "propietario") throw new UserError("Solo el propietario puede cambiar el briefing del negocio.");
    const clean: Brief = {
      tipo: TIPOS.includes(b.tipo) ? b.tipo : "", platos: PLATOS.includes(b.platos) ? b.platos : "",
      compras: COMPRAS.some((c) => c[0] === b.compras) ? b.compras : "", tpv: TPVS.includes(b.tpv) ? b.tpv : TPVS[0],
      rol: ROLES_BRIEF.some((r) => r[0] === b.rol) ? b.rol : "", objetivo: OBJ.some((o) => o[0] === b.objetivo) ? b.objetivo : "",
    };
    if (!clean.tipo || !clean.platos || !clean.compras || !clean.rol || !clean.objetivo) throw new UserError("Responde a todas las preguntas.");
    await sys((c) => c.query("update organizations set briefing = $2 where id = $1", [org.id, JSON.stringify(clean)]));
    if (org.onboardingDone) { await setFlash("Briefing actualizado. Hoy se ordena según tu objetivo."); redirect("/hoy"); }
    redirect("/alta/local");
  });
}

export type LocalState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> } | undefined;
export async function guardarLocal(_: LocalState, f: FormData): Promise<LocalState> {
  const d = leerLocal(f);
  const r = await run(async () => {
    const { s, org } = await requireOnboarding();
    requirePerm(org, "local:editar");
    if (d.fields) return fail("Revisa los datos marcados.", d.fields);
    const name = d.vals.name || org.name;
    await withTenant(org.id, async (c) => {
      const cur = await one<{ id: string }>(c, "select id from locales order by created_at limit 1");
      // Terminada el alta, el local se edita en Cuenta. Solo se crea aquí si falta (sin local no se puede entrar en la app).
      if (cur && org.onboardingDone) throw new UserError("El alta ya está terminada: cambia los datos del local en Cuenta.");
      const vals = [name, d.vals.address, d.vals.postal_code, d.vals.ciudad, d.vals.iva_venta, d.vals.fc_objetivo, d.vals.comensales_dia];
      if (cur) await c.query("update locales set name=$2, address=$3, postal_code=$4, ciudad=$5, iva_venta=$6, fc_objetivo=$7, comensales_dia=$8 where id=$1", [cur.id, ...vals]);
      const id = cur?.id ?? (await one<{ id: string }>(c, "insert into locales (tenant_id, name, address, postal_code, ciudad, iva_venta, fc_objetivo, comensales_dia) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id", [org.id, ...vals]))!.id;
      await audit(c, org.id, s.userId, cur ? "editar" : "crear", "local", id, {});
    });
    // El negocio se llama como su local (un local por negocio en V1), igual que al guardarlo en Cuenta.
    await sys((c) => c.query("update organizations set name = $2 where id = $1", [org.id, name]));
  });
  if (!r.ok) return r.fields ? { fields: r.fields, values: d.values } : { error: r.error, values: d.values };
  redirect("/alta/proveedores");
}

export async function altaProveedor(nombre: string, tipo: string): Promise<Result<{ id: string; name: string; tipo: string }>> {
  return run(async () => {
    const { s, org } = await enAlta("proveedores:editar");
    const n = String(nombre ?? "").trim();
    const t = PROV_TIPOS.includes(tipo) ? tipo : "";
    if (n.length < 2) throw new UserError("Escribe el nombre del proveedor.");
    return withTenant(org.id, async (c) => {
      const l = await one<{ id: string }>(c, "select id from locales order by created_at limit 1");
      if (!l) throw new UserError("Primero guarda tu local.");
      const dup = await one(c, "select 1 from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [l.id, n]);
      if (dup) throw new UserError("Ese proveedor ya está en la lista.");
      const p = await one<{ id: string }>(c, "insert into proveedores (tenant_id, local_id, name, tipo, origen) values ($1,$2,$3,$4,'alta') returning id", [org.id, l.id, n.slice(0, 80), t]);
      await audit(c, org.id, s.userId, "crear", "proveedor", p!.id, {});
      return { ok: true as const, data: { id: p!.id, name: n.slice(0, 80), tipo: t } };
    });
  });
}

/** Quita un proveedor añadido en el alta. Nunca borra uno que ya se usa: el borrado arrastraría precios, preferencias y pedidos. */
export async function quitarProveedorAlta(id: string): Promise<Result> {
  return run(async () => {
    const { s, org } = await enAlta("proveedores:editar");
    if (!isUuid(id)) throw new UserError("Proveedor no válido.");
    await withTenant(org.id, async (c) => {
      const del = await c.query(`delete from proveedores p where p.id = $1 and p.origen = 'alta'
        and not exists (select 1 from documentos where proveedor_id = p.id)
        and not exists (select 1 from articulos where last_proveedor_id = p.id or proveedor_pref_id = p.id)
        and not exists (select 1 from articulo_proveedor where proveedor_id = p.id)
        and not exists (select 1 from pedidos where proveedor_id = p.id)
        and not exists (select 1 from precio_eventos where proveedor_id = p.id)`, [id]);
      if (del.rowCount) { await audit(c, org.id, s.userId, "borrar", "proveedor", id, {}); return; }
      // Si ya no existe, no hay nada que quitar. Si sigue ahí, se avisa: la lista no debe esconder un proveedor que sigue guardado.
      if (await one(c, "select 1 from proveedores where id = $1", [id])) throw new UserError("Este proveedor ya tiene datos en RESTORA y no se puede quitar desde aquí.");
    });
  });
}

export async function terminarAlta(): Promise<Result> {
  return run(async () => {
    const { org } = await requireOnboarding();
    requirePerm(org, "local:editar");
    if (!(await loadLocal(org.id))) redirect("/alta/local");
    await sys((c) => c.query("update organizations set onboarding_done_at = coalesce(onboarding_done_at, now()) where id = $1", [org.id]));
    redirect("/hoy?tour=1");
  });
}

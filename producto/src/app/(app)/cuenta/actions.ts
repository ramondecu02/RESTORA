"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isUuid, one, sys, withTenant, type Db } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { audit } from "@/server/audit";
import { hashPassword, randomToken, sha256, verifyPassword } from "@/server/crypto";
import { destroyUserSessions, setFlash } from "@/server/session";
import { inviteEmail, sendEmail } from "@/server/email";
import { env } from "@/server/env";
import { rateLimit } from "@/server/ratelimit";
import { deleteTenantFiles } from "@/server/storage";
import { isRole, ROLE_LABEL, type Role } from "@/server/rbac";
import { cargarDemo, quitarDemo } from "@/server/demo/seed";
import { cancelarCobros, checkoutUrl, portalUrl, stripeOn } from "@/server/billing";

export async function guardarLocal(input: { name: string; address: string; postal_code: string; ciudad: string; lema: string; iva_venta: number; fc_objetivo: number; comensales_dia: number | null }): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "local:editar");
    if (input.name.trim().length < 2) throw new UserError("Pon el nombre del local.");
    if (!(input.fc_objetivo >= 5 && input.fc_objetivo <= 80)) throw new UserError("El food cost objetivo va del 5 al 80 %.");
    await withTenant(ctx.tenantId, async (c) => {
      await c.query("update locales set name=$2, address=$3, postal_code=$4, ciudad=$5, lema=$6, iva_venta=$7, fc_objetivo=$8, comensales_dia=$9 where id=$1",
        [ctx.local.id, input.name.trim().slice(0, 80), input.address.trim().slice(0, 160), input.postal_code.trim().slice(0, 10), input.ciudad.trim().slice(0, 60), input.lema.trim().slice(0, 80),
          input.iva_venta === 21 ? 21 : 10, input.fc_objetivo, input.comensales_dia && input.comensales_dia > 0 ? Math.round(input.comensales_dia) : null]);
      await audit(c, ctx.tenantId, ctx.userId, "editar", "local", ctx.local.id, {});
    });
    await sys((c) => c.query("update organizations set name = $2 where id = $1", [ctx.tenantId, input.name.trim().slice(0, 80)]));
    refresh();
    return { ok: true, msg: "Local guardado" };
  });
}

export async function guardarPerfil(name: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    if (name.trim().length < 2) throw new UserError("Escribe tu nombre.");
    await sys((c) => c.query("update users set name = $2 where id = $1", [ctx.userId, name.trim().slice(0, 80)]));
    refresh();
    return { ok: true, msg: "Perfil guardado" };
  });
}

export async function cambiarPassword(actual: string, nueva: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    if (nueva.length < 8) throw new UserError("La contraseña nueva necesita al menos 8 caracteres.");
    if (!(await rateLimit(`pw:${ctx.userId}`, 6, 900))) throw new UserError("Demasiados intentos. Espera unos minutos.");
    const u = await sys((c) => one<{ password_hash: string }>(c, "select password_hash from users where id = $1", [ctx.userId]));
    if (!u || !(await verifyPassword(actual, u.password_hash))) throw new UserError("La contraseña actual no es correcta.");
    const h = await hashPassword(nueva);
    await sys((c) => c.query("update users set password_hash = $2 where id = $1", [ctx.userId, h]));
    await destroyUserSessions(ctx.userId, ctx.sessionId);
    return { ok: true, msg: "Contraseña cambiada. Hemos cerrado la sesión en tus otros dispositivos." };
  });
}

export async function cerrarOtrasSesiones(): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    await destroyUserSessions(ctx.userId, ctx.sessionId);
    return { ok: true, msg: "Sesiones cerradas en los demás dispositivos." };
  });
}

export async function demo(accion: "cargar" | "quitar"): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "demo");
    if (accion === "cargar") { await cargarDemo(ctx); refresh(); return { ok: true, msg: "Datos de ejemplo cargados: Casa Pujol con seis meses de compras y ventas." }; }
    await quitarDemo(ctx); refresh();
    return { ok: true, msg: "Datos de ejemplo quitados. Lo tuyo sigue intacto." };
  });
}

export async function eliminarNegocio(confirmacion: string): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "facturacion");
    if (confirmacion.trim().toLowerCase() !== ctx.org.name.trim().toLowerCase()) throw new UserError("Escribe el nombre exacto del negocio para confirmar.");
    // Primero se cancela la suscripción: si Stripe falla no se borra nada y se puede volver a intentar
    try { await cancelarCobros(ctx.tenantId); } catch (e) {
      console.error("[stripe] no se pudo cancelar al eliminar el negocio", e);
      throw new UserError("No hemos podido cancelar tu suscripción, así que no hemos borrado nada. Inténtalo de nuevo en un momento.");
    }
    await sys((c) => c.query("delete from organizations where id = $1", [ctx.tenantId]));
    // Toda la carpeta del negocio (t/<negocio>/), también los archivos que ya no estaban enlazados: fotos sueltas, subidas a medias
    await deleteTenantFiles(ctx.tenantId);
  });
  if (r.ok) { await setFlash("Negocio eliminado con todos sus datos."); redirect("/sin-negocio"); }
  return r;
}

// ---- Usuarios e invitaciones ----
export async function invitar(email: string, role: string): Promise<Result<{ link: string; enviado: boolean }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "usuarios");
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new UserError("Revisa el email.");
    if (!isRole(role)) throw new UserError("Elige un rol.");
    // Límite por negocio y también por persona: crear otro negocio no da más invitaciones
    if (!(await rateLimit(`inv:${ctx.tenantId}`, 30, 3600)) || !(await rateLimit(`inv-u:${ctx.userId}`, 30, 3600)) || !(await rateLimit(`inv-ud:${ctx.userId}`, 60, 86400)))
      throw new UserError("Demasiadas invitaciones seguidas. Espera un poco.");
    const ya = await sys((c) => one(c, "select 1 from memberships m join users u on u.id = m.user_id where m.org_id = $1 and lower(u.email) = $2", [ctx.tenantId, e]));
    if (ya) throw new UserError("Esa persona ya está en tu equipo.");
    const token = randomToken(24);
    await sys(async (c) => {
      await c.query("delete from invitations where org_id = $1 and lower(email) = $2 and accepted_at is null", [ctx.tenantId, e]);
      await c.query("insert into invitations (org_id, email, role, token_hash, invited_by, expires_at) values ($1,$2,$3,$4,$5, now() + interval '7 days')", [ctx.tenantId, e, role, sha256(token), ctx.userId]);
    });
    const link = `${env.appUrl}/invitacion/${token}`;
    const enviado = await sendEmail({ to: e, ...inviteEmail(ctx.org.name, ctx.name, ROLE_LABEL[role as Role], link) });
    refresh();
    return { ok: true, data: { link, enviado }, msg: enviado ? `Invitación enviada a ${e}` : `Invitación creada, pero no hemos podido enviar el email a ${e}. Pásale tú el enlace.` };
  });
}
export async function revocarInvitacion(id: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "usuarios");
    if (!isUuid(id)) throw new UserError("Invitación no válida.");
    await sys((c) => c.query("delete from invitations where id = $1 and org_id = $2", [id, ctx.tenantId]));
    refresh();
  });
}
async function propietarios(c: Db, orgId: string) {
  return (await one<{ n: number }>(c, "select count(*)::int as n from memberships where org_id = $1 and role = 'propietario'", [orgId]))!.n;
}
/** Bloquea el negocio para cambiar el equipo (dos cambios a la vez no pueden dejarlo sin propietario) y comprueba que quien actúa sigue pudiendo. */
async function bloquearEquipo(c: Db, orgId: string, userId: string) {
  await c.query("select 1 from organizations where id = $1 for update", [orgId]);
  const yo = await one<{ role: Role }>(c, "select role from memberships where org_id = $1 and user_id = $2", [orgId, userId]);
  if (!yo) throw new UserError("Ya no estás en este negocio.");
  requirePerm(yo, "usuarios");
}
export async function cambiarRol(userId: string, role: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "usuarios");
    if (!isUuid(userId) || !isRole(role)) throw new UserError("Datos no válidos.");
    await sys(async (c) => {
      await bloquearEquipo(c, ctx.tenantId, ctx.userId);
      const cur = await one<{ role: string }>(c, "select role from memberships where org_id = $1 and user_id = $2", [ctx.tenantId, userId]);
      if (!cur) throw new UserError("Esa persona no está en tu equipo.");
      if (cur.role === "propietario" && role !== "propietario" && (await propietarios(c, ctx.tenantId)) <= 1) throw new UserError("Tiene que quedar al menos un propietario.");
      await c.query("update memberships set role = $3 where org_id = $1 and user_id = $2", [ctx.tenantId, userId, role]);
    });
    refresh();
    return { ok: true, msg: "Rol cambiado" };
  });
}
export async function quitarMiembro(userId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "usuarios");
    if (!isUuid(userId)) throw new UserError("Datos no válidos.");
    await sys(async (c) => {
      await bloquearEquipo(c, ctx.tenantId, ctx.userId);
      const cur = await one<{ role: string }>(c, "select role from memberships where org_id = $1 and user_id = $2", [ctx.tenantId, userId]);
      if (!cur) throw new UserError("Esa persona no está en tu equipo.");
      if (cur.role === "propietario" && (await propietarios(c, ctx.tenantId)) <= 1) throw new UserError("No puedes quitar al único propietario.");
      await c.query("delete from memberships where org_id = $1 and user_id = $2", [ctx.tenantId, userId]);
      await c.query("delete from sessions where user_id = $1 and org_id = $2", [userId, ctx.tenantId]);
    });
    refresh();
    return { ok: true, msg: "Acceso retirado" };
  });
}

// ---- Facturación ----
export async function irAPagar(): Promise<Result<string>> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "facturacion");
    if (!stripeOn()) throw new UserError("Los pagos aún no están configurados en esta instalación.");
    const url = await checkoutUrl(ctx.tenantId, ctx.email, ctx.org.name);
    // Ya hay una suscripción en marcha (p. ej. aún no había llegado el aviso de Stripe): no se abre otra
    if (!url) { refresh(); throw new UserError("Ya tienes una suscripción en marcha. Para cambiarla o cancelarla, entra en «Gestionar pagos y facturas»."); }
    return { ok: true as const, data: url };
  });
  if (r.ok && r.data) redirect(r.data);
  return r;
}
export async function irAPortal(): Promise<Result<string>> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "facturacion");
    if (!stripeOn()) throw new UserError("Los pagos aún no están configurados en esta instalación.");
    return { ok: true as const, data: await portalUrl(ctx.tenantId) };
  });
  if (r.ok && r.data) redirect(r.data);
  return r;
}

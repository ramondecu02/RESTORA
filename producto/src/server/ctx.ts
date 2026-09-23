// Contexto de la petición: sesión → negocio → local. Con guardas que redirigen.
import { redirect } from "next/navigation";
import { cache } from "react";
import { one, sys, withTenant } from "./db";
import { getSession, type SessionData } from "./session";
import { can, type Perm, type Role } from "./rbac";

export type Briefing = { rol?: string; objetivo?: string; compras?: string; albaranes?: string; tipo?: string };
export type OrgInfo = {
  id: string; name: string; role: Role; briefing: Briefing; onboardingDone: boolean;
  planStatus: "trial" | "active" | "past_due" | "canceled"; trialEndsAt: string | null; stripeCustomerId: string | null;
};
export type Local = {
  id: string; name: string; address: string; postal_code: string; ciudad: string; lema: string;
  iva_venta: number; fc_objetivo: number; comensales_dia: number | null; currency: string;
};
export type AppCtx = SessionData & { org: OrgInfo; local: Local; tenantId: string; role: Role };

export class UserError extends Error {}

export const getOrg = cache(async (): Promise<{ s: SessionData; org: OrgInfo | null } | null> => {
  const s = await getSession();
  if (!s) return null;
  const row = await sys((c) => one<{
    id: string; name: string; role: Role; briefing: Briefing; onboarding_done_at: Date | null; plan_status: OrgInfo["planStatus"];
    trial_ends_at: Date | null; stripe_customer_id: string | null;
  }>(c, `select o.id, o.name, m.role, o.briefing, o.onboarding_done_at, o.plan_status, o.trial_ends_at, o.stripe_customer_id
         from memberships m join organizations o on o.id = m.org_id
         where m.user_id = $1 order by (o.id = $2) desc, m.created_at asc limit 1`, [s.userId, s.orgId]));
  if (!row) return { s, org: null };
  return {
    s,
    org: {
      id: row.id, name: row.name, role: row.role, briefing: row.briefing || {}, onboardingDone: !!row.onboarding_done_at,
      planStatus: row.plan_status, trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString() : null,
      stripeCustomerId: row.stripe_customer_id,
    },
  };
});

export async function loadLocal(tenantId: string): Promise<Local | null> {
  return withTenant(tenantId, (c) => one<Local>(c,
    "select id, name, address, postal_code, ciudad, lema, iva_venta, fc_objetivo, comensales_dia, currency from locales order by created_at limit 1"));
}

export const getAppCtx = cache(async (): Promise<AppCtx | null> => {
  const o = await getOrg();
  if (!o || !o.org || !o.s.verified) return null;
  const local = await loadLocal(o.org.id);
  if (!local) return null;
  return { ...o.s, org: o.org, local, tenantId: o.org.id, role: o.org.role };
});

/** Para páginas de la app: exige sesión, email verificado, negocio y alta completada. */
export async function requireApp(): Promise<AppCtx> {
  const o = await getOrg();
  if (!o) redirect("/entrar");
  if (!o.s.verified) redirect("/verificar");
  if (!o.org) redirect("/sin-negocio");
  if (!o.org.onboardingDone && o.org.role === "propietario") redirect("/bienvenida");
  const ctx = await getAppCtx();
  if (!ctx) redirect("/alta/local");
  return ctx;
}
/** Para el alta guiada: sesión + email verificado + negocio. */
export async function requireOnboarding() {
  const o = await getOrg();
  if (!o) redirect("/entrar");
  if (!o.s.verified) redirect("/verificar");
  if (!o.org) redirect("/sin-negocio");
  return { s: o.s, org: o.org };
}
export function requirePerm(ctx: { role: Role }, p: Perm) {
  if (!can(ctx.role, p)) throw new UserError("Tu rol no permite hacer esto. Pide acceso al propietario.");
}
export const hasPerm = (ctx: { role: Role }, p: Perm) => can(ctx.role, p);

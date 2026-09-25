// Cobros con Stripe (suscripción mensual con prueba gratis). Opcional: sin claves, la app funciona en modo prueba.
import Stripe from "stripe";
import { isUuid, one, sys, type Db } from "./db";
import { env } from "./env";

let client: Stripe | null = null;
export const stripeOn = () => !!(env.stripeKey && env.stripePrice);
const stripe = () => (client ??= new Stripe(env.stripeKey));

type Plan = "trial" | "active" | "past_due" | "canceled";
// La prueba de Stripe (trialing) ya es una suscripción contratada: cuenta como activa, no como la prueba gratuita de la app
const STATUS: Record<string, Plan> = {
  trialing: "active", active: "active", past_due: "past_due", unpaid: "past_due", incomplete: "past_due", canceled: "canceled", incomplete_expired: "canceled", paused: "past_due",
};
// Cuando un cliente tiene varias suscripciones manda la viva, luego la que falla y por último la terminada
const RANGO: Record<string, number> = { active: 4, trialing: 4, past_due: 3, unpaid: 3, paused: 3, incomplete: 2, canceled: 1, incomplete_expired: 1 };
/** Estados en los que el cliente ya tiene una suscripción que cobra o va a cobrar. */
const VIVA = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

type Sub = { id: string; status: string; created: number };
/** La suscripción que decide el plan del negocio: la de mejor estado y, a igualdad, la más reciente. */
export function suscripcionVigente<T extends Sub>(subs: T[]): T | null {
  let best: T | null = null;
  for (const s of subs) {
    const r = RANGO[s.status] ?? 0, rb = best ? RANGO[best.status] ?? 0 : -1;
    if (r > rb || (r === rb && s.created > best!.created)) best = s;
  }
  return best;
}
export const planDeSuscripcion = (status: string): Plan => STATUS[status] ?? "past_due";
export const suscripcionViva = (s: Sub | null) => !!s && VIVA.has(s.status);

const subsDe = async (customer: string) => (await stripe().subscriptions.list({ customer, status: "all", limit: 100 })).data;
const faltaEnStripe = (e: unknown) => (e as { code?: string })?.code === "resource_missing";

/** Cliente de Stripe del negocio; si no tiene, lo crea. Con dos peticiones a la vez se queda uno solo. */
async function clienteDe(orgId: string, email: string, orgName: string): Promise<string> {
  const org = await sys((c) => one<{ stripe_customer_id: string | null }>(c, "select stripe_customer_id from organizations where id = $1", [orgId]));
  if (org?.stripe_customer_id) return org.stripe_customer_id;
  const cu = await stripe().customers.create({ email, name: orgName, metadata: { org_id: orgId } });
  if (await sys((c) => one(c, "update organizations set stripe_customer_id = $2 where id = $1 and stripe_customer_id is null returning id", [orgId, cu.id]))) return cu.id;
  // Otra petición guardó antes su cliente: se usa ese y se borra el que sobra
  await stripe().customers.del(cu.id).catch((e) => console.error("[stripe] no se pudo borrar el cliente sobrante", cu.id, (e as Error).message));
  const cur = await sys((c) => one<{ stripe_customer_id: string | null }>(c, "select stripe_customer_id from organizations where id = $1", [orgId]));
  if (!cur?.stripe_customer_id) throw new Error("Negocio sin cliente de Stripe");
  return cur.stripe_customer_id;
}

/** Enlace de pago. Devuelve null si el cliente ya tiene una suscripción en marcha (y la deja reflejada en el negocio). */
export async function checkoutUrl(orgId: string, email: string, orgName: string): Promise<string | null> {
  const customer = await clienteDe(orgId, email, orgName);
  const vig = suscripcionVigente(await subsDe(customer));
  if (vig && suscripcionViva(vig)) {
    await sys((c) => c.query("update organizations set plan_status = $2, stripe_subscription_id = $3 where id = $1 and stripe_customer_id = $4", [orgId, planDeSuscripcion(vig.status), vig.id, customer]));
    return null;
  }
  // Solo un pago abierto por cliente: si se pagara en dos pestañas habría dos suscripciones
  for (const s of (await stripe().checkout.sessions.list({ customer, status: "open", limit: 20 })).data) await stripe().checkout.sessions.expire(s.id);
  const org = await sys((c) => one<{ trial_ends_at: Date | null }>(c, "select trial_ends_at from organizations where id = $1", [orgId]));
  const trialEnd = org?.trial_ends_at ? Math.floor(new Date(org.trial_ends_at).getTime() / 1000) : null;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: orgId,
    line_items: [{ price: env.stripePrice, quantity: 1 }],
    subscription_data: { metadata: { org_id: orgId }, ...(trialEnd && trialEnd > Date.now() / 1000 + 3600 * 48 ? { trial_end: trialEnd } : {}) },
    locale: "es",
    allow_promotion_codes: true,
    success_url: `${env.appUrl}/cuenta/facturacion?ok=1`,
    cancel_url: `${env.appUrl}/cuenta/facturacion`,
  });
  return session.url!;
}

export async function portalUrl(orgId: string): Promise<string> {
  const org = await sys((c) => one<{ stripe_customer_id: string | null }>(c, "select stripe_customer_id from organizations where id = $1", [orgId]));
  if (!org?.stripe_customer_id) throw new Error("Sin cliente de Stripe");
  const s = await stripe().billingPortal.sessions.create({ customer: org.stripe_customer_id, return_url: `${env.appUrl}/cuenta/facturacion`, locale: "es" });
  return s.url;
}

/** Al borrar el negocio: cancela sus suscripciones y borra su cliente en Stripe para que no se le cobre más. */
export async function cancelarCobros(orgId: string): Promise<void> {
  if (!stripeOn()) return;
  const org = await sys((c) => one<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>(c,
    "select stripe_customer_id, stripe_subscription_id from organizations where id = $1", [orgId]));
  if (!org) return;
  const subs: Sub[] = org.stripe_customer_id ? await subsDe(org.stripe_customer_id) : [];
  if (org.stripe_subscription_id && !subs.some((s) => s.id === org.stripe_subscription_id)) {
    try { subs.push(await stripe().subscriptions.retrieve(org.stripe_subscription_id)); } catch (e) { if (!faltaEnStripe(e)) throw e; }
  }
  for (const s of subs) if (s.status !== "canceled" && s.status !== "incomplete_expired") await stripe().subscriptions.cancel(s.id);
  if (org.stripe_customer_id) { try { await stripe().customers.del(org.stripe_customer_id); } catch (e) { if (!faltaEnStripe(e)) throw e; } }
}

const idDe = (x: string | { id: string } | null | undefined) => (typeof x === "string" ? x : x?.id ?? null);
const EV_FACTURA = new Set(["invoice.payment_failed", "invoice.paid", "invoice.payment_succeeded"]);
/** Cliente (y negocio, si el evento lo dice) al que afecta un evento; null si el evento no cambia el plan. */
function refDeEvento(ev: Stripe.Event): { customer: string; orgId: string | null } | null {
  if (ev.type === "checkout.session.completed") {
    const s = ev.data.object as Stripe.Checkout.Session;
    const customer = idDe(s.customer);
    return customer && s.mode === "subscription" ? { customer, orgId: s.client_reference_id } : null;
  }
  if (ev.type.startsWith("customer.subscription.")) {
    const sub = ev.data.object as Stripe.Subscription;
    const customer = idDe(sub.customer);
    return customer ? { customer, orgId: sub.metadata?.org_id ?? null } : null;
  }
  if (EV_FACTURA.has(ev.type)) {
    const inv = ev.data.object as Stripe.Invoice;
    const customer = idDe(inv.customer);
    return customer ? { customer, orgId: inv.parent?.subscription_details?.metadata?.org_id ?? null } : null;
  }
  return null;
}

/** Refleja en el negocio del cliente su suscripción vigente, leída de Stripe en este momento. */
async function sincronizar(c: Db, customer: string, orgHint: string | null) {
  // El bloqueo ordena los eventos del mismo negocio: el último en aplicarse es el que ha leído Stripe más tarde
  let org = await one<{ id: string }>(c, "select id from organizations where stripe_customer_id = $1 for update", [customer]);
  if (!org && isUuid(orgHint)) {
    // Cliente todavía sin guardar en el negocio: solo se adopta si el negocio no tiene otro
    org = await one<{ id: string }>(c, "select id from organizations where id = $1 and stripe_customer_id is null for update", [orgHint]);
    if (org) await c.query("update organizations set stripe_customer_id = $2 where id = $1", [org.id, customer]);
  }
  if (!org) return;
  const vig = suscripcionVigente(await subsDe(customer));
  if (vig) await c.query("update organizations set plan_status = $2, stripe_subscription_id = $3 where id = $1", [org.id, planDeSuscripcion(vig.status), vig.id]);
}

export async function handleWebhook(raw: string, sig: string): Promise<{ ok: boolean; status: number; msg?: string }> {
  let ev: Stripe.Event;
  try { ev = stripe().webhooks.constructEvent(raw, sig, env.stripeWebhookSecret); }
  catch (e) { return { ok: false, status: 400, msg: "Firma no válida: " + (e as Error).message }; }
  const ref = refDeEvento(ev);
  // Registrar el evento y aplicarlo en la misma transacción: si algo falla, Stripe lo reintenta.
  // No se copia el estado que trae el evento (puede llegar tarde o desordenado): se vuelve a leer en Stripe.
  const dup = await sys(async (c) => {
    const fresh = await one(c, "insert into stripe_events (id, type) values ($1, $2) on conflict do nothing returning id", [ev.id, ev.type]);
    if (!fresh) return true;
    if (ref) await sincronizar(c, ref.customer, ref.orgId);
    return false;
  });
  if (dup) return { ok: true, status: 200, msg: "repetido" };
  return { ok: true, status: 200 };
}

/** Aviso del plan para la barra superior: solo cuando hay que hacer algo y los pagos están activados. */
export function avisoPlan(org: { planStatus: string; trialEndsAt: string | null }): string | null {
  if (!stripeOn()) return null;
  if (org.planStatus === "past_due") return "No hemos podido cobrar tu suscripción.";
  if (org.planStatus === "canceled") return "Tu suscripción está cancelada. Tus datos siguen aquí.";
  if (org.planStatus === "trial" && org.trialEndsAt && new Date(org.trialEndsAt).getTime() < Date.now()) return "Tu prueba gratuita ha terminado.";
  return null;
}

// Cobros con Stripe (suscripción mensual con prueba gratis). Opcional: sin claves, la app funciona en modo prueba.
import Stripe from "stripe";
import { one, sys } from "./db";
import { env } from "./env";

let client: Stripe | null = null;
export const stripeOn = () => !!(env.stripeKey && env.stripePrice);
const stripe = () => (client ??= new Stripe(env.stripeKey));

export async function checkoutUrl(orgId: string, email: string, orgName: string): Promise<string> {
  const org = await sys((c) => one<{ stripe_customer_id: string | null; trial_ends_at: Date | null }>(c, "select stripe_customer_id, trial_ends_at from organizations where id = $1", [orgId]));
  let customer = org?.stripe_customer_id ?? null;
  if (!customer) {
    const cu = await stripe().customers.create({ email, name: orgName, metadata: { org_id: orgId } });
    customer = cu.id;
    await sys((c) => c.query("update organizations set stripe_customer_id = $2 where id = $1", [orgId, customer]));
  }
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

const STATUS: Record<string, "trial" | "active" | "past_due" | "canceled"> = {
  trialing: "trial", active: "active", past_due: "past_due", unpaid: "past_due", incomplete: "past_due", canceled: "canceled", incomplete_expired: "canceled", paused: "past_due",
};

export async function handleWebhook(raw: string, sig: string): Promise<{ ok: boolean; status: number; msg?: string }> {
  let ev: Stripe.Event;
  try { ev = stripe().webhooks.constructEvent(raw, sig, env.stripeWebhookSecret); }
  catch (e) { return { ok: false, status: 400, msg: "Firma no válida: " + (e as Error).message }; }
  const fresh = await sys((c) => one(c, "insert into stripe_events (id, type) values ($1, $2) on conflict do nothing returning id", [ev.id, ev.type]));
  if (!fresh) return { ok: true, status: 200, msg: "repetido" };
  if (ev.type === "checkout.session.completed") {
    const s = ev.data.object as Stripe.Checkout.Session;
    const orgId = s.client_reference_id;
    if (orgId) await sys((c) => c.query("update organizations set stripe_customer_id = coalesce(stripe_customer_id, $2), stripe_subscription_id = $3, plan_status = 'active' where id = $1",
      [orgId, typeof s.customer === "string" ? s.customer : s.customer?.id ?? null, typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null]));
  }
  if (ev.type.startsWith("customer.subscription.")) {
    const sub = ev.data.object as Stripe.Subscription;
    const status = ev.type === "customer.subscription.deleted" ? "canceled" : STATUS[sub.status] ?? "past_due";
    const cust = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    await sys((c) => c.query("update organizations set plan_status = $2, stripe_subscription_id = $3 where stripe_customer_id = $1", [cust, status, sub.id]));
  }
  if (ev.type === "invoice.payment_failed") {
    const inv = ev.data.object as Stripe.Invoice;
    const cust = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
    if (cust) await sys((c) => c.query("update organizations set plan_status = 'past_due' where stripe_customer_id = $1", [cust]));
  }
  return { ok: true, status: 200 };
}

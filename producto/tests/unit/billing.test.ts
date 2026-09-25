import { beforeEach, describe, expect, it, vi } from "vitest";

// Stripe y la base de datos de mentira: el webhook debe decidir con lo que hay ahora en Stripe, no con lo que trae el evento
const subs: Record<string, { id: string; status: string; created: number }[]> = {};
const llamadas: string[] = [];
let nCliente = 0;
vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: (raw: string) => JSON.parse(raw) };
    subscriptions = {
      list: async ({ customer }: { customer: string }) => ({ data: subs[customer] ?? [] }),
      retrieve: async (id: string) => { llamadas.push(`retrieve ${id}`); throw Object.assign(new Error("No such subscription"), { code: "resource_missing" }); },
      cancel: async (id: string) => { llamadas.push(`cancel ${id}`); return { id }; },
    };
    customers = {
      create: async () => { await new Promise((r) => setTimeout(r, 20)); return { id: `cus_n${++nCliente}` }; },
      del: async (id: string) => { llamadas.push(`del ${id}`); return { id, deleted: true }; },
    };
    checkout = { sessions: {
      list: async () => ({ data: [{ id: "cs_abierta" }] }),
      expire: async (id: string) => { llamadas.push(`expire ${id}`); return { id }; },
      create: async (p: { customer: string }) => { llamadas.push(`checkout ${p.customer}`); return { url: `https://pago.example/${p.customer}` }; },
    } };
  },
}));
type Org = { id: string; stripe_customer_id: string | null; plan_status: string; stripe_subscription_id: string | null; trial_ends_at?: Date | null };
let orgs: Org[] = [];
const events = new Set<string>();
vi.mock("@/server/db", async (orig) => {
  const o = await orig<typeof import("@/server/db")>();
  const query = async (sql: string, p: unknown[]) => {
    let m: Org | undefined;
    if (sql.startsWith("insert into stripe_events")) { if (events.has(p[0] as string)) return { rows: [] }; events.add(p[0] as string); return { rows: [{ id: p[0] }] }; }
    if (sql.includes("where stripe_customer_id = $1 for update")) return { rows: orgs.filter((x) => x.stripe_customer_id === p[0]) };
    if (sql.includes("where id = $1 and stripe_customer_id is null for update")) return { rows: orgs.filter((x) => x.id === p[0] && !x.stripe_customer_id) };
    if (sql === "update organizations set stripe_customer_id = $2 where id = $1" && (m = orgs.find((x) => x.id === p[0]))) m.stripe_customer_id = p[1] as string;
    if (sql.startsWith("update organizations set plan_status = $2") && (m = orgs.find((x) => x.id === p[0] && (p[3] === undefined || x.stripe_customer_id === p[3])))) Object.assign(m, { plan_status: p[1], stripe_subscription_id: p[2] });
    if (sql.includes("where id = $1 and stripe_customer_id is null returning id")) {
      m = orgs.find((x) => x.id === p[0] && !x.stripe_customer_id);
      if (m) m.stripe_customer_id = p[1] as string;
      return { rows: m ? [{ id: m.id }] : [] };
    }
    if (sql.startsWith("select stripe_customer_id") || sql.startsWith("select trial_ends_at")) return { rows: orgs.filter((x) => x.id === p[0]) };
    return { rows: [] };
  };
  return { ...o, sys: (fn: (c: unknown) => Promise<unknown>) => fn({ query }) };
});
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_PRICE_ID = "price_x";

const ORG = "11111111-1111-4111-8111-111111111111", OTRA = "22222222-2222-4222-8222-222222222222";
let n = 0;
const ev = (type: string, object: Record<string, unknown>) => JSON.stringify({ id: `evt_${++n}`, type, data: { object } });

describe("plan a partir de las suscripciones de Stripe", async () => {
  const { suscripcionVigente, planDeSuscripcion, suscripcionViva } = await import("@/server/billing");
  it("la prueba de Stripe cuenta como suscripción activa", () => {
    expect(planDeSuscripcion("trialing")).toBe("active");
    expect(planDeSuscripcion("unpaid")).toBe("past_due");
    expect(planDeSuscripcion("incomplete_expired")).toBe("canceled");
  });
  it("manda la suscripción viva, aunque haya otra terminada más reciente", () => {
    const v = suscripcionVigente([{ id: "a", status: "active", created: 1 }, { id: "b", status: "canceled", created: 5 }]);
    expect(v?.id).toBe("a");
    expect(suscripcionVigente([{ id: "a", status: "canceled", created: 1 }, { id: "b", status: "canceled", created: 5 }])?.id).toBe("b");
    expect(suscripcionVigente([])).toBeNull();
  });
  it("solo una suscripción que cobra impide contratar otra", () => {
    expect(suscripcionViva({ id: "a", status: "trialing", created: 1 })).toBe(true);
    expect(suscripcionViva({ id: "a", status: "past_due", created: 1 })).toBe(true);
    expect(suscripcionViva({ id: "a", status: "canceled", created: 1 })).toBe(false);
    expect(suscripcionViva(null)).toBe(false);
  });
});

describe("webhook de Stripe", async () => {
  const { handleWebhook } = await import("@/server/billing");
  beforeEach(() => {
    orgs = [{ id: ORG, stripe_customer_id: "cus_1", plan_status: "trial", stripe_subscription_id: null }];
    for (const k of Object.keys(subs)) delete subs[k];
    events.clear();
  });
  it("un aviso de cobro fallido que llega tarde no pisa una suscripción ya al día", async () => {
    subs.cus_1 = [{ id: "sub_1", status: "active", created: 10 }];
    expect((await handleWebhook(ev("invoice.payment_failed", { customer: "cus_1" }), "")).status).toBe(200);
    expect(orgs[0]).toMatchObject({ plan_status: "active", stripe_subscription_id: "sub_1" });
  });
  it("cancelar una suscripción duplicada no cancela el plan si queda otra activa", async () => {
    subs.cus_1 = [{ id: "sub_B", status: "active", created: 20 }, { id: "sub_A", status: "canceled", created: 10 }];
    await handleWebhook(ev("customer.subscription.deleted", { id: "sub_A", customer: "cus_1", status: "canceled", metadata: {} }), "");
    expect(orgs[0]).toMatchObject({ plan_status: "active", stripe_subscription_id: "sub_B" });
  });
  it("una suscripción en prueba de Stripe queda activa aunque el evento llegue después del pago", async () => {
    subs.cus_1 = [{ id: "sub_1", status: "trialing", created: 10 }];
    await handleWebhook(ev("checkout.session.completed", { mode: "subscription", customer: "cus_1", client_reference_id: ORG }), "");
    await handleWebhook(ev("customer.subscription.created", { id: "sub_1", customer: "cus_1", status: "trialing", metadata: { org_id: ORG } }), "");
    expect(orgs[0]).toMatchObject({ plan_status: "active", stripe_subscription_id: "sub_1" });
  });
  it("un evento repetido no se vuelve a aplicar", async () => {
    subs.cus_1 = [{ id: "sub_1", status: "active", created: 10 }];
    const raw = ev("customer.subscription.updated", { id: "sub_1", customer: "cus_1", status: "active", metadata: {} });
    expect((await handleWebhook(raw, "")).msg).toBeUndefined();
    expect((await handleWebhook(raw, "")).msg).toBe("repetido");
  });
  it("un cliente aún sin guardar se asocia por el negocio del evento, pero nunca a un negocio con otro cliente", async () => {
    orgs.push({ id: OTRA, stripe_customer_id: null, plan_status: "trial", stripe_subscription_id: null });
    subs.cus_2 = [{ id: "sub_2", status: "active", created: 10 }];
    await handleWebhook(ev("customer.subscription.created", { id: "sub_2", customer: "cus_2", status: "active", metadata: { org_id: ORG } }), "");
    expect(orgs[0]).toMatchObject({ stripe_customer_id: "cus_1", plan_status: "trial" });
    await handleWebhook(ev("customer.subscription.created", { id: "sub_2", customer: "cus_2", status: "active", metadata: { org_id: OTRA } }), "");
    expect(orgs[1]).toMatchObject({ stripe_customer_id: "cus_2", plan_status: "active", stripe_subscription_id: "sub_2" });
  });
  it("si no hay suscripciones en Stripe no cambia el plan", async () => {
    await handleWebhook(ev("invoice.payment_failed", { customer: "cus_1" }), "");
    expect(orgs[0]).toMatchObject({ plan_status: "trial", stripe_subscription_id: null });
  });
});

describe("contratar y dar de baja", async () => {
  const { cancelarCobros, checkoutUrl } = await import("@/server/billing");
  beforeEach(() => {
    orgs = [{ id: ORG, stripe_customer_id: "cus_1", plan_status: "trial", stripe_subscription_id: null, trial_ends_at: null }];
    for (const k of Object.keys(subs)) delete subs[k];
    llamadas.length = 0;
  });
  it("con una suscripción ya en marcha no abre otro pago y deja el plan al día", async () => {
    subs.cus_1 = [{ id: "sub_1", status: "trialing", created: 10 }];
    expect(await checkoutUrl(ORG, "a@b.es", "Casa")).toBeNull();
    expect(orgs[0]).toMatchObject({ plan_status: "active", stripe_subscription_id: "sub_1" });
    expect(llamadas.filter((l) => l.startsWith("checkout"))).toEqual([]);
  });
  it("sin suscripción abre el pago y cierra los que quedaran abiertos", async () => {
    subs.cus_1 = [{ id: "sub_0", status: "canceled", created: 10 }];
    expect(await checkoutUrl(ORG, "a@b.es", "Casa")).toBe("https://pago.example/cus_1");
    expect(llamadas).toEqual(["expire cs_abierta", "checkout cus_1"]);
  });
  it("dos pagos a la vez crean un solo cliente", async () => {
    orgs[0].stripe_customer_id = null;
    const [a, b] = await Promise.all([checkoutUrl(ORG, "a@b.es", "Casa"), checkoutUrl(ORG, "a@b.es", "Casa")]);
    expect(a).toBe(b);
    expect(a).toBe(`https://pago.example/${orgs[0].stripe_customer_id}`);
    expect(llamadas.filter((l) => l.startsWith("del"))).toHaveLength(1);
  });
  it("al borrar el negocio cancela lo que sigue cobrando y borra el cliente", async () => {
    orgs[0].stripe_subscription_id = "sub_viejo";
    subs.cus_1 = [{ id: "sub_1", status: "active", created: 10 }, { id: "sub_0", status: "canceled", created: 5 }, { id: "sub_2", status: "past_due", created: 8 }];
    await cancelarCobros(ORG);
    expect(llamadas).toEqual(["retrieve sub_viejo", "cancel sub_1", "cancel sub_2", "del cus_1"]);
  });
});

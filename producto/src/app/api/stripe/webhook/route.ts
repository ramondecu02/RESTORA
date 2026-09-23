import { NextResponse } from "next/server";
import { handleWebhook, stripeOn } from "@/server/billing";
import { env } from "@/server/env";

export async function POST(req: Request) {
  if (!stripeOn() || !env.stripeWebhookSecret) return NextResponse.json({ error: "stripe_off" }, { status: 404 });
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();
  const r = await handleWebhook(raw, sig);
  return NextResponse.json({ ok: r.ok, msg: r.msg }, { status: r.status });
}

import { NextResponse, type NextRequest } from "next/server";
import { createLead, listLeads } from "@/lib/leads";
import { parseLeadInput } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { isAdminAuthed } from "@/lib/session";
import { isLeadStatus } from "@/lib/types";

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// POST /api/leads — public. Validate, insert, respond 201.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  // Honeypot: silently accept so bots don't learn they were filtered.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const limit = rateLimit(`lead:${clientIp(request)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = parseLeadInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 });
  }

  try {
    const lead = await createLead(parsed.value);
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// GET /api/leads — protected. List with filters/order.
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? undefined;
  const filters = {
    city: params.get("city")?.trim() || undefined,
    status: statusParam && isLeadStatus(statusParam) ? statusParam : undefined,
    q: params.get("q")?.trim() || undefined,
  };

  const leads = await listLeads(filters);
  return NextResponse.json({ ok: true, leads });
}

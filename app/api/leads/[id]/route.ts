import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { getLead, updateLead } from "@/lib/leads";
import { parseLeadUpdate } from "@/lib/validation";
import { isAdminAuthed } from "@/lib/session";
import { isLeadStatus } from "@/lib/types";

// PATCH /api/leads/:id — protected. Change status/notes.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const parsed = parseLeadUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, errors: parsed.errors }, { status: 400 });
  }
  if (parsed.value.status !== undefined && !isLeadStatus(parsed.value.status)) {
    return NextResponse.json(
      { ok: false, errors: { status: "invalid" } },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.value).length === 0) {
    return NextResponse.json({ ok: false, error: "empty_update" }, { status: 400 });
  }

  try {
    const lead = await updateLead(id, parsed.value);
    return NextResponse.json({ ok: true, lead });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    console.error("Failed to update lead", error);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// GET /api/leads/:id — protected. Single lead (used by the admin detail view).
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, lead });
}

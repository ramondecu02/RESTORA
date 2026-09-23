import { NextResponse } from "next/server";
import { getAppCtx } from "@/server/ctx";
import { isUuid, one, withTenant } from "@/server/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppCtx();
  if (!ctx) return NextResponse.json({ error: "no_session" }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const d = await withTenant(ctx.tenantId, async (c) => {
    // Si una lectura se queda colgada (el proceso se cortó), se marca como error para poder reintentar.
    await c.query("update documentos set status = 'error', ocr_error = 'La lectura ha tardado demasiado. Vuelve a intentarlo.' where id = $1 and status = 'leyendo' and created_at < now() - interval '6 minutes'", [id]);
    return one<{ status: string; ocr_error: string | null }>(c, "select status, ocr_error from documentos where id = $1", [id]);
  });
  if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ status: d.status, error: d.ocr_error }, { headers: { "Cache-Control": "no-store" } });
}

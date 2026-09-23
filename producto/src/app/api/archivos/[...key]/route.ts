// Archivos privados: solo se sirven al negocio al que pertenecen.
import { NextResponse } from "next/server";
import { getAppCtx } from "@/server/ctx";
import { openFile } from "@/server/storage";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const ctx = await getAppCtx();
  if (!ctx) return new NextResponse("No autorizado", { status: 401 });
  const k = key.map(decodeURIComponent).join("/");
  if (!k.startsWith(`t/${ctx.tenantId}/`) || k.includes("..")) return new NextResponse("No encontrado", { status: 404 });
  const f = await openFile(k);
  if (!f) return new NextResponse("No encontrado", { status: 404 });
  const body: BodyInit = Buffer.isBuffer(f.body) ? new Uint8Array(f.body) : (f.body as ReadableStream<Uint8Array>);
  return new NextResponse(body, {
    headers: {
      "Content-Type": f.contentType,
      "Cache-Control": "private, max-age=600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ...(f.size ? { "Content-Length": String(f.size) } : {}),
    },
  });
}

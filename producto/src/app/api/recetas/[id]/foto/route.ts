// Foto del plato: se guarda privada y se asocia a la receta.
import { NextResponse } from "next/server";
import { getAppCtx } from "@/server/ctx";
import { isUuid, one, withTenant } from "@/server/db";
import { can } from "@/server/rbac";
import { randomToken } from "@/server/crypto";
import { deleteFile, extFor, putFile, sniffMime } from "@/server/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAppCtx();
  if (!ctx) return NextResponse.json({ error: "Tu sesión ha caducado." }, { status: 401 });
  if (!can(ctx.role, "escandallos")) return NextResponse.json({ error: "Tu rol no permite cambiar fotos." }, { status: 403 });
  if (!isUuid(id)) return NextResponse.json({ error: "Receta no válida." }, { status: 400 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("foto");
  if (!(f instanceof File) || !f.size) return NextResponse.json({ error: "Elige una foto." }, { status: 400 });
  if (f.size > 3 * 1024 * 1024) return NextResponse.json({ error: "La foto pesa demasiado (máximo 3 MB)." }, { status: 413 });
  const data = Buffer.from(await f.arrayBuffer());
  const mime = sniffMime(data);
  if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return NextResponse.json({ error: "Sube una foto JPG, PNG o WebP." }, { status: 415 });
  const old = await withTenant(ctx.tenantId, (c) => one<{ foto_key: string | null }>(c, "select foto_key from recetas where id = $1 and local_id = $2", [id, ctx.local.id]));
  if (!old) return NextResponse.json({ error: "Receta no encontrada." }, { status: 404 });
  const key = `t/${ctx.tenantId}/fotos/${id}-${randomToken(6)}.${extFor(mime)}`;
  await putFile(key, data, mime);
  await withTenant(ctx.tenantId, (c) => c.query("update recetas set foto_key = $2 where id = $1", [id, key]));
  if (old.foto_key && old.foto_key.startsWith(`t/${ctx.tenantId}/`)) await deleteFile(old.foto_key);
  return NextResponse.json({ ok: true, url: "/api/archivos/" + key });
}

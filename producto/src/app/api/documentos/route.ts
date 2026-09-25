// Subida de documentos (albarán, factura o carta). La lectura sigue en segundo plano con after().
import { after, NextResponse, type NextRequest } from "next/server";
import { randomToken } from "@/server/crypto";
import { getAppCtx } from "@/server/ctx";
import { one, withTenant } from "@/server/db";
import { can } from "@/server/rbac";
import { rateLimit } from "@/server/ratelimit";
import { deleteFile, extFor, putFile, sniffMime } from "@/server/storage";
import { processDocumento } from "@/server/domain/compras";

export const maxDuration = 300;
const MAX_TOTAL = 4.4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const ctx = await getAppCtx();
  if (!ctx) return NextResponse.json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, { status: 401 });
  if (!can(ctx.role, "compras")) return NextResponse.json({ error: "Tu rol no permite subir documentos." }, { status: 403 });
  if (!(await rateLimit(`upload:${ctx.tenantId}`, 80, 3600))) return NextResponse.json({ error: "Has subido muchos documentos en poco tiempo. Espera unos minutos." }, { status: 429 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "No hemos recibido el archivo. Prueba otra vez." }, { status: 400 }); }
  const kind = String(form.get("kind") ?? "albaran");
  if (!["albaran", "factura", "carta"].includes(kind)) return NextResponse.json({ error: "Tipo de documento no válido." }, { status: 400 });
  if (kind === "carta" && !can(ctx.role, "escandallos")) return NextResponse.json({ error: "Tu rol no permite subir la carta." }, { status: 403 });
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  if (!files.length) return NextResponse.json({ error: "Añade al menos una foto o un PDF." }, { status: 400 });
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > MAX_TOTAL) return NextResponse.json({ error: "Los archivos pesan demasiado (máximo 4 MB en total). Sube menos páginas o un PDF más ligero." }, { status: 413 });
  const bufs: { data: Buffer; mime: string; name: string }[] = [];
  for (const f of files) {
    const data = Buffer.from(await f.arrayBuffer());
    const mime = sniffMime(data);
    if (!mime) return NextResponse.json({ error: `«${f.name}» no es una foto ni un PDF.` }, { status: 415 });
    if (mime === "image/heic") return NextResponse.json({ error: "Las fotos HEIC no se pueden leer. Haz la foto desde la app o conviértela a JPG." }, { status: 415 });
    bufs.push({ data, mime, name: f.name.slice(0, 120) });
  }
  const id = await withTenant(ctx.tenantId, async (c) => {
    const d = await one<{ id: string }>(c, `insert into documentos (tenant_id, local_id, kind, status, source, pages, created_by)
      values ($1,$2,$3,'leyendo','ocr',$4,$5) returning id`, [ctx.tenantId, ctx.local.id, kind, bufs.length, ctx.userId]);
    return d!.id;
  });
  const keys: string[] = [];
  try {
    let i = 0;
    for (const b of bufs) {
      const key = `t/${ctx.tenantId}/docs/${id}/${i}-${randomToken(6)}.${extFor(b.mime)}`;
      keys.push(key);
      await putFile(key, b.data, b.mime);
      await withTenant(ctx.tenantId, (c) => c.query("insert into documento_archivos (tenant_id, documento_id, idx, storage_key, mime, bytes, name) values ($1,$2,$3,$4,$5,$6,$7)",
        [ctx.tenantId, id, i, key, b.mime, b.data.length, b.name]));
      i++;
    }
  } catch (e) {
    console.error("[subida] error guardando archivos", e);
    // Con páginas a medias la lectura saldría incompleta: se quita el documento entero y se vuelve a subir
    try {
      await withTenant(ctx.tenantId, (c) => c.query("delete from documentos where id = $1", [id]));
      for (const k of keys) await deleteFile(k);
    } catch (e2) {
      console.error("[subida] no se pudo quitar el documento a medias", e2);
      await withTenant(ctx.tenantId, (c) => c.query("update documentos set status = 'error', ocr_error = 'No se pudo guardar el archivo.' where id = $1", [id])).catch(() => {});
    }
    return NextResponse.json({ error: "No hemos podido guardar el archivo. Prueba otra vez." }, { status: 500 });
  }
  const tenantId = ctx.tenantId;
  after(() => processDocumento(tenantId, id));
  return NextResponse.json({ id });
}

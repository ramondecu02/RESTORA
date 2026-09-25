"use server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { rateLimit } from "@/server/ratelimit";
import { setFlash } from "@/server/session";
import { borrarDocumento, confirmarAlbaran, crearManual, processDocumento, type ConfirmResult } from "@/server/domain/compras";
import type { Draft } from "@/lib/ocr-types";

export async function guardarBorrador(docId: string, draft: Draft): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    const json = JSON.stringify(draft);
    if (json.length > 600_000) throw new UserError("El borrador es demasiado grande.");
    await withTenant(ctx.tenantId, (c) => c.query("update documentos set draft = $2 where id = $1 and status = 'revisar' and local_id = $3", [docId, json, ctx.local.id]));
  });
}

export async function confirmar(docId: string, draft: Draft, opts: { forzarTotal?: boolean; forzarDuplicado?: boolean }): Promise<ConfirmResult> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    if (!draft || !Array.isArray(draft.lineas)) throw new UserError("El borrador no es válido.");
    // Las columnas de IVA son enteras: un 5,2 % (recargo de equivalencia) no se puede guardar como IVA
    for (const l of draft.lineas) {
      const iva = l?.iva ?? l?.ivaLeido ?? l?.ivaEsperado;
      if (!l?.ignorar && iva != null && !Number.isInteger(iva)) throw new UserError(`El IVA de «${String(l.texto ?? "").slice(0, 60)}» tiene que ser un tipo entero (0, 4, 5, 10 o 21 %). Elígelo en la línea.`);
    }
    const res = await confirmarAlbaran(ctx, docId, draft, opts);
    return { ok: true as const, data: res };
  });
  if (!r.ok) return { ok: false, error: r.error };
  return r.data!;
}

export async function borrar(docId: string): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    await borrarDocumento(ctx, docId);
  });
  if (r.ok) { await setFlash("Albarán borrado. Precios, stock y costes vuelven a como estaban."); redirect("/compras"); }
  return r;
}

export async function descartar(docId: string, to: "/compras" | "/carta" = "/compras"): Promise<Result> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    const d = await withTenant(ctx.tenantId, (c) => one<{ status: string }>(c, "select status from documentos where id = $1 and local_id = $2", [docId, ctx.local.id]));
    if (!d) throw new UserError("Documento no encontrado.");
    if (d.status === "guardado") throw new UserError("Este albarán ya está guardado. Bórralo desde su ficha.");
    await borrarDocumento(ctx, docId);
  });
  if (r.ok) { await setFlash("Documento descartado."); redirect(to === "/carta" ? "/carta" : "/compras"); }
  return r;
}

export async function reintentar(docId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    if (!isUuid(docId)) throw new UserError("Documento no válido.");
    const doc = await withTenant(ctx.tenantId, (c) => one<{ status: string; pages: number; archivos: number }>(c, `select d.status, d.pages,
      (select count(*)::int from documento_archivos a where a.documento_id = d.id) as archivos from documentos d where d.id = $1 and d.source = 'ocr' and d.local_id = $2`, [docId, ctx.local.id]));
    if (!doc || doc.status !== "error") throw new UserError("No se puede volver a leer este documento.");
    // Si la subida se cortó a medias, leer solo parte de las páginas daría una compra incompleta
    if (!doc.archivos || doc.archivos < doc.pages) throw new UserError("Faltan páginas de este documento. Descártalo y súbelo otra vez.");
    // Cada lectura cuesta: cuenta en el mismo límite que las subidas
    if (!(await rateLimit(`upload:${ctx.tenantId}`, 80, 3600))) throw new UserError("Has leído muchos documentos en poco tiempo. Espera unos minutos.");
    const ok = await withTenant(ctx.tenantId, (c) => one(c, "update documentos set status = 'leyendo', ocr_error = null, created_at = now() where id = $1 and status = 'error' and source = 'ocr' and local_id = $2 returning id", [docId, ctx.local.id]));
    if (!ok) throw new UserError("No se puede volver a leer este documento.");
    const t = ctx.tenantId;
    after(() => processDocumento(t, docId));
    refresh();
  });
}

export async function aMano(docId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "compras");
    const draft = { proveedor: { nombreLeido: null, cif: null, id: null, conf: "alta", nuevo: true, nombre: "" }, tipoDocumento: "albaran", duplicado: null, manual: true, resumen: null,
      numero: null, numeroAlt: null, confNumero: "alta", numeroRevisado: true, fecha: null, confFecha: "alta", total: null, confTotal: "alta", desglose: [], observaciones: null, lineas: [] };
    await withTenant(ctx.tenantId, (c) => c.query("update documentos set status = 'revisar', source = 'manual', draft = $2, ocr_error = null where id = $1 and status = 'error' and local_id = $3", [docId, JSON.stringify(draft), ctx.local.id]));
    refresh();
  });
}

export async function empezarManual(proveedorId: string | null): Promise<void> {
  const ctx = await requireApp();
  requirePerm(ctx, "compras");
  const id = await crearManual(ctx, [], proveedorId && isUuid(proveedorId) ? proveedorId : null);
  redirect(`/compras/${id}`);
}

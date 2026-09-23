"use server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { isUuid, one, withTenant } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
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
    const ok = await withTenant(ctx.tenantId, (c) => one(c, "update documentos set status = 'leyendo', ocr_error = null, created_at = now() where id = $1 and status in ('error','revisar') and source = 'ocr' and local_id = $2 returning id", [docId, ctx.local.id]));
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

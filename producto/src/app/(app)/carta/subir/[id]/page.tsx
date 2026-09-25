import { notFound, redirect } from "next/navigation";
import { all, isUuid, one, withTenant } from "@/server/db";
import { hasPerm, requireApp } from "@/server/ctx";
import type { OcrCarta } from "@/lib/ocr-types";
import { Leyendo } from "../../../compras/[id]/leyendo";
import { ErrorDoc } from "../../../compras/[id]/error-doc";
import { CartaReview } from "./review";

export const metadata = { title: "Revisa la carta" };

export default async function CartaDoc({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApp();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const d = await withTenant(ctx.tenantId, async (c) => {
    const doc = await one<{ id: string; status: string; kind: string; ocr: OcrCarta | null; ocr_error: string | null; pages: number }>(c,
      "select id, status, kind, ocr, ocr_error, pages from documentos where id = $1 and local_id = $2", [id, ctx.local.id]);
    if (!doc) return null;
    const files = await all<{ storage_key: string; mime: string; name: string }>(c, "select storage_key, mime, name from documento_archivos where documento_id = $1 order by idx", [id]);
    const recetas = await all<{ id: string; name: string; pvp: number | null }>(c, "select id, name, pvp from recetas where local_id = $1 and not archived and tipo <> 'elaboracion'", [ctx.local.id]);
    return { doc, files, recetas };
  });
  if (!d || d.doc.kind !== "carta") notFound();
  const url = (k: string) => "/api/archivos/" + k.split("/").map(encodeURIComponent).join("/");
  if (d.doc.status === "leyendo" || d.doc.status === "subido") return <Leyendo id={id} kind="carta" name={d.files[0]?.name ?? "Carta"} pages={d.doc.pages} thumb={d.files[0]?.mime.startsWith("image/") ? url(d.files[0].storage_key) : null} />;
  if (d.doc.status === "error") return <ErrorDoc id={id} error={d.doc.ocr_error} canRetry carta />;
  if (d.doc.status === "guardado") redirect("/carta");
  return <CartaReview docId={id} carta={d.doc.ocr ?? { nombre_local: null, platos: [] }} recetas={d.recetas} files={d.files.map((f) => ({ url: url(f.storage_key), mime: f.mime }))} canPrecios={hasPerm(ctx, "carta:precios")} />;
}

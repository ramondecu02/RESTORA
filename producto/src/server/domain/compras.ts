// Compras: lectura del documento en segundo plano, confirmación del albarán y borrado con vuelta atrás.
import { all, one, withTenant, type Db } from "../db";
import { readAlbaran, readCarta, type OcrFile } from "../ocr";
import { readFileBytes, deleteFile } from "../storage";
import { hmac } from "../crypto";
import { audit } from "../audit";
import { UserError, type AppCtx } from "../ctx";
import { getCatalog } from "../queries/catalog";
import { recomputeCosts } from "./costs";
import { aprenderAlias, articuloDesdeCatalogo, crearArticulo, rebuildArticulo } from "./articulos";
import { buildDraft, draftCheck, matchProveedor, pendientes, prettyName, type ArtRef, type CatRef, type PackMemory, type ProvRef } from "@/lib/draft";
import { lineaCoste } from "@/lib/pmp";
import { isoDate } from "@/lib/format";
import type { Draft, Resumen } from "@/lib/ocr-types";
import type { BaseUnit } from "@/lib/units";

export async function loadRefs(c: Db, localId: string, provId: string | null) {
  const { cats, items } = await getCatalog();
  // Secuencial: una sola conexión (transacción) no admite consultas en paralelo
  const arts = await all<{ id: string; name: string; aliases: string[]; unit: BaseUnit; category_id: string; iva: number; rend: number }>(c,
      "select id, name, aliases, unit, category_id, iva, rend from articulos where local_id = $1 and not archived", [localId]);
  const provs = await all<{ id: string; name: string; cif: string }>(c, "select id, name, cif from proveedores where local_id = $1 and not archived", [localId]);
  const packs = await all<{ articulo_id: string; unidad_compra: string; factor: number }>(c, `select distinct on (ap.articulo_id) ap.articulo_id, ap.unidad_compra, ap.factor
      from articulo_proveedor ap join articulos a on a.id = ap.articulo_id where a.local_id = $1 and ap.origen = 'albaran'
      order by ap.articulo_id, (ap.proveedor_id = $2) desc, ap.fecha desc nulls last`, [localId, provId]);
  const artRefs: ArtRef[] = arts.map((a) => ({ id: a.id, name: a.name, aliases: a.aliases, unit: a.unit, categoryId: a.category_id, iva: a.iva, rend: a.rend }));
  const catalog: CatRef[] = items.map((i) => ({ id: i.id, name: i.name, aliases: i.aliases, unit: i.unit, categoryId: i.category_id, rend: i.rend }));
  const catIva = new Map(cats.map((c) => [c.id, c.iva]));
  const provRefs: ProvRef[] = provs;
  const packMem: PackMemory = new Map(packs.map((p) => [p.articulo_id, { unidadCompra: p.unidad_compra, factor: p.factor }]));
  return { arts: artRefs, catalog, catIva, provs: provRefs, packs: packMem };
}

const validDate = (s: string | null | undefined) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  if (d.getTime() > now + 3 * 864e5 || d.getTime() < now - 3 * 365 * 864e5) return null;
  return s;
};

/** Lee el documento (en segundo plano tras la subida) y deja el borrador listo para revisar. */
export async function processDocumento(tenantId: string, docId: string): Promise<void> {
  const doc = await withTenant(tenantId, (c) => one<{ id: string; kind: string; status: string; local_id: string; local_name: string }>(c,
    "select d.id, d.kind, d.status, d.local_id, l.name as local_name from documentos d join locales l on l.id = d.local_id where d.id = $1", [docId]));
  if (!doc || doc.status !== "leyendo") return;
  const files = await withTenant(tenantId, (c) => all<{ storage_key: string; mime: string; name: string }>(c,
    "select storage_key, mime, name from documento_archivos where documento_id = $1 order by idx", [docId]));
  try {
    const loaded: OcrFile[] = [];
    for (const f of files) {
      const got = await readFileBytes(f.storage_key);
      if (got) loaded.push({ data: got.data, mime: f.mime, name: f.name });
    }
    if (!loaded.length) throw new Error("No encontramos el archivo subido.");
    if (doc.kind === "carta") {
      const { carta, usage } = await readCarta(loaded);
      await withTenant(tenantId, (c) => c.query(`update documentos set status = 'revisar', ocr = $2, ocr_model = $3, ocr_input_tokens = $4,
        ocr_output_tokens = $5, ocr_cost_usd = $6, ocr_ms = $7, ocr_error = null where id = $1 and status = 'leyendo'`,
        [docId, JSON.stringify(carta), usage.model, usage.inputTokens, usage.outputTokens, usage.costUsd, usage.ms]));
      return;
    }
    const { ocr, usage } = await readAlbaran(loaded, doc.local_name);
    await withTenant(tenantId, async (c) => {
      const refs0 = await loadRefs(c, doc.local_id, null);
      const prov = matchProveedor(ocr.proveedor_nombre, ocr.proveedor_cif, refs0.provs);
      const refs = prov ? await loadRefs(c, doc.local_id, prov.id) : refs0;
      const draft: Draft = buildDraft(ocr, refs);
      if (prov && ocr.numero) {
        const dup = await one<{ id: string; fecha: string | null }>(c, `select id, fecha from documentos where local_id = $1 and proveedor_id = $2
          and lower(numero) = lower($3) and status = 'guardado' and id <> $4 limit 1`, [doc.local_id, prov.id, ocr.numero, docId]);
        draft.duplicado = dup ? { id: dup.id, fecha: dup.fecha } : null;
      }
      const fecha = validDate(ocr.fecha);
      if (!fecha) draft.fecha = isoDate();
      await c.query(`update documentos set status = 'revisar', ocr = $2, draft = $3, ocr_model = $4, ocr_input_tokens = $5, ocr_output_tokens = $6,
        ocr_cost_usd = $7, ocr_ms = $8, ocr_error = null, proveedor_id = $9, numero = $10, fecha = $11, total = $12
        where id = $1 and status = 'leyendo'`,
        [docId, JSON.stringify(ocr), JSON.stringify(draft), usage.model + (usage.escalated ? " (repaso)" : ""), usage.inputTokens, usage.outputTokens,
          usage.costUsd, usage.ms, prov?.id ?? null, ocr.numero, fecha ?? isoDate(), ocr.total]);
    });
  } catch (e) {
    const msg = (e as Error).message || "Error desconocido";
    console.error("[ocr] lectura fallida", docId, msg);
    const friendly = /overloaded|529|rate|429/i.test(msg) ? "El servicio de lectura está saturado. Vuelve a intentarlo en un minuto."
      : /api key|401|authentication/i.test(msg) ? "La lectura automática no está configurada (falta la clave de la API)."
      : msg.length < 160 ? msg : "No hemos podido leer el documento.";
    await withTenant(tenantId, (c) => c.query("update documentos set status = 'error', ocr_error = $2 where id = $1", [docId, friendly]));
  }
}

type ConfirmOpts = { forzarTotal?: boolean; forzarDuplicado?: boolean };
export type ConfirmResult = { ok: true; id: string } | { ok: false; error: string; kind?: "total" | "duplicado" | "pendientes"; diff?: number };

export async function confirmarAlbaran(ctx: AppCtx, docId: string, input: Draft, opts: ConfirmOpts): Promise<ConfirmResult> {
  const d: Draft = JSON.parse(JSON.stringify(input));
  const lineas = d.lineas.filter((l) => !l.ignorar);
  if (!lineas.length) return { ok: false, error: "El albarán no tiene líneas de producto." };
  const pend = d.lineas.reduce((n, l) => n + pendientes(l).length, 0);
  if (pend) return { ok: false, error: `Quedan ${pend} decisiones por tomar.`, kind: "pendientes" };
  for (const l of lineas) {
    if (!l.match?.id && !(l.match?.tipo === "nuevo" && l.nuevo)) return { ok: false, error: `Falta el artículo de «${l.texto}».`, kind: "pendientes" };
    if (l.cantidad == null || !(l.cantidad > 0)) return { ok: false, error: `Revisa la cantidad de «${l.texto}».`, kind: "pendientes" };
    if (l.precio == null || l.precio < 0) return { ok: false, error: `Revisa el precio de «${l.texto}».`, kind: "pendientes" };
    if (!(l.factor && l.factor > 0)) return { ok: false, error: `Falta la conversión de unidades de «${l.texto}».`, kind: "pendientes" };
    const iva = l.iva ?? l.ivaLeido ?? l.ivaEsperado;
    if (iva == null || iva < 0 || iva > 30) return { ok: false, error: `Falta el IVA de «${l.texto}».`, kind: "pendientes" };
  }
  const chk = draftCheck(d);
  if (d.total != null && !chk.cuadra && !opts.forzarTotal) return { ok: false, error: "El total no cuadra con el del documento.", kind: "total", diff: chk.diff ?? 0 };
  const provName = (d.proveedor.nombre || prettyName(d.proveedor.nombreLeido ?? "")).trim();
  if (!d.proveedor.id && provName.length < 2) return { ok: false, error: "Indica el proveedor.", kind: "pendientes" };
  const fecha = validDate(d.fecha) ?? isoDate();
  const fechaTs = new Date(fecha + "T12:00:00Z");

  const res = await withTenant(ctx.tenantId, async (c): Promise<ConfirmResult & { keys?: string[] }> => {
    const doc = await one<{ id: string; status: string; local_id: string; demo: boolean }>(c, "select id, status, local_id, demo from documentos where id = $1 for update", [docId]);
    if (!doc || doc.local_id !== ctx.local.id) throw new UserError("Documento no encontrado.");
    if (doc.status === "guardado") return { ok: true, id: docId };
    if (doc.status !== "revisar") throw new UserError("Este documento no está listo para guardar.");

    // Proveedor
    let provId = d.proveedor.id;
    let proveedorNuevo = false;
    if (provId) {
      const p = await one(c, "select 1 from proveedores where id = $1 and local_id = $2", [provId, ctx.local.id]);
      if (!p) provId = null;
    }
    if (!provId) {
      const ex = await one<{ id: string }>(c, "select id from proveedores where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, provName]);
      if (ex) provId = ex.id;
      else {
        const p = await one<{ id: string }>(c, "insert into proveedores (tenant_id, local_id, name, cif, origen) values ($1,$2,$3,$4,'albaran') returning id",
          [ctx.tenantId, ctx.local.id, provName.slice(0, 80), (d.proveedor.cif ?? "").slice(0, 20)]);
        provId = p!.id; proveedorNuevo = true;
      }
    } else if (d.proveedor.cif) {
      await c.query("update proveedores set cif = $2 where id = $1 and cif = ''", [provId, d.proveedor.cif.slice(0, 20)]);
    }
    // Duplicado
    if (d.numero && !opts.forzarDuplicado) {
      const dup = await one<{ id: string }>(c, "select id from documentos where local_id = $1 and proveedor_id = $2 and lower(numero) = lower($3) and status = 'guardado' and id <> $4",
        [ctx.local.id, provId, d.numero, docId]);
      if (dup) return { ok: false, error: `Ya guardaste el documento ${d.numero} de este proveedor.`, kind: "duplicado" };
    }

    const before = new Map((await all<{ id: string; coste_cache: number | null }>(c, "select id, coste_cache from recetas where local_id = $1 and not archived", [ctx.local.id])).map((r) => [r.id, r.coste_cache]));
    const resumen: Resumen = { lineas: lineas.length, nuevos: [], cambios: [], primeros: [], recetas: [], proveedorNuevo, total: 0 };
    const affected = new Set<string>();
    const artCache = new Map<string, { name: string; unit: string; last_price: number | null; last_purchase_at: Date | null; catalog_item_id: string | null }>();
    let idx = 0;
    for (const l of lineas) {
      let artId: string;
      if (l.match!.tipo === "tuyo") {
        const a = await one<{ id: string }>(c, "select id from articulos where id = $1 and local_id = $2", [l.match!.id, ctx.local.id]);
        if (!a) throw new UserError(`El artículo de «${l.texto}» ya no existe. Elige otro.`);
        artId = a.id;
      } else if (l.match!.tipo === "catalogo") {
        const had = await one(c, "select 1 from articulos where local_id = $1 and catalog_item_id = $2 and not archived", [ctx.local.id, l.match!.id]);
        artId = await articuloDesdeCatalogo(c, ctx.tenantId, ctx.local.id, l.match!.id!, doc.demo);
        if (!had) resumen.nuevos.push({ id: artId, name: "" });
      } else {
        const n = l.nuevo!;
        const had = await one(c, "select 1 from articulos where local_id = $1 and lower(name) = lower($2) and not archived", [ctx.local.id, n.name.trim()]);
        artId = await crearArticulo(c, ctx.tenantId, ctx.local.id, { name: n.name, categoryId: n.categoryId, unit: n.unit, rend: n.rend, demo: doc.demo });
        if (!had) resumen.nuevos.push({ id: artId, name: n.name });
      }
      if (!artCache.has(artId)) {
        const a = await one<{ name: string; unit: string; last_price: number | null; last_purchase_at: Date | null; catalog_item_id: string | null }>(c,
          "select name, unit, last_price, last_purchase_at, catalog_item_id from articulos where id = $1", [artId]);
        artCache.set(artId, a!);
      }
      const art = artCache.get(artId)!;
      if (l.texto && !l.manual) await aprenderAlias(c, artId, l.texto);
      const iva = (l.iva ?? l.ivaLeido ?? l.ivaEsperado)!;
      // Si el usuario ha confirmado un IVA distinto del del artículo, el artículo lo aprende y no se vuelve a preguntar
      if (l.decisiones.iva && l.iva != null) await c.query("update articulos set iva = $2 where id = $1 and iva <> $2", [artId, l.iva]);
      const lc = lineaCoste(l.cantidad!, l.precio!, l.descuento || 0, l.bonificadas || 0, l.factor!);
      await c.query(`insert into compra_lineas (tenant_id, documento_id, idx, texto, articulo_id, cantidad, unidad_compra, factor, precio, descuento, bonificadas, importe, iva, coste_unit)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [ctx.tenantId, docId, idx++, l.texto.slice(0, 200), artId, l.cantidad, (l.unidadCompra || art.unit).slice(0, 40), l.factor, l.precio, l.descuento || 0, l.bonificadas || 0, lc.importe, iva, lc.costeUnit]);
      await c.query(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, ref_id, fecha, created_by)
        values ($1,$2,$3,'compra',$4,$5,'documento',$6,$7,$8)`, [ctx.tenantId, ctx.local.id, artId, lc.unidades, lc.costeUnit, docId, fechaTs, ctx.userId]);
      // Una compra que se registra ahora es posterior a cualquier precio puesto a mano: ese precio deja de mandar
      await c.query("update articulos set precio_manual = null, precio_manual_at = null where id = $1 and precio_manual is not null", [artId]);
      await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, documento_id, origen, nota)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'albaran','')
        on conflict (articulo_id, proveedor_id) do update set unidad_compra = excluded.unidad_compra, factor = excluded.factor, precio = excluded.precio,
          precio_unit = excluded.precio_unit, fecha = excluded.fecha, documento_id = excluded.documento_id, origen = 'albaran'
        where articulo_proveedor.fecha is null or articulo_proveedor.fecha <= excluded.fecha`,
        [ctx.tenantId, artId, provId, (l.unidadCompra || art.unit).slice(0, 40), l.factor, l.precio, lc.costeUnit, fecha, docId]);
      const prev = art.last_price;
      const isNewer = !art.last_purchase_at || fechaTs >= new Date(art.last_purchase_at);
      if (prev != null && prev > 0 && isNewer && !affected.has(artId)) {
        const v = (lc.costeUnit - prev) / prev;
        if (Math.abs(v) >= 0.005) {
          await c.query(`insert into precio_eventos (tenant_id, articulo_id, proveedor_id, documento_id, precio_anterior, precio_nuevo, variacion, fecha)
            values ($1,$2,$3,$4,$5,$6,$7,$8)`, [ctx.tenantId, artId, provId, docId, prev, lc.costeUnit, v, fecha]);
          resumen.cambios.push({ id: artId, name: art.name, antes: prev, ahora: lc.costeUnit, variacion: v, unit: art.unit });
        }
      } else if (prev == null && !affected.has(artId)) {
        resumen.primeros.push({ id: artId, name: art.name, precio: lc.costeUnit, unit: art.unit });
      }
      affected.add(artId);
      if (art.catalog_item_id && !doc.demo) {
        await c.query(`insert into bench_price_obs (catalog_item_id, unit, price_per_unit, week, region, contributor)
          values ($1, $2, $3, date_trunc('week', $4::date)::date, left($5, 2), $6)`,
          [art.catalog_item_id, art.unit, lc.costeUnit, fecha, ctx.local.postal_code ?? "", hmac("bench:" + ctx.tenantId)]);
      }
    }
    for (const a of affected) await rebuildArticulo(c, a);
    for (const n of resumen.nuevos) if (!n.name) n.name = artCache.get(n.id)?.name ?? "";
    const after = await recomputeCosts(c, ctx.local.id);
    const names = new Map((await all<{ id: string; name: string }>(c, "select id, name from recetas where local_id = $1 and not archived", [ctx.local.id])).map((r) => [r.id, r.name]));
    for (const [id, v] of after) {
      const b = before.get(id) ?? null;
      if (b == null || Math.abs(v - b) > 0.005) resumen.recetas.push({ id, name: names.get(id) ?? "", antes: b, ahora: v });
    }
    resumen.total = d.total ?? chk.total;
    d.resumen = resumen;
    d.fecha = fecha;
    d.proveedor.id = provId;
    await c.query(`update documentos set status = 'guardado', proveedor_id = $2, numero = $3, fecha = $4, base = $5, cuota = $6, total = $7, draft = $8, saved_at = now()
      where id = $1`, [docId, provId, d.numero, fecha, round2(chk.base), round2(chk.cuota), round2(d.total ?? chk.total), JSON.stringify(d)]);
    await audit(c, ctx.tenantId, ctx.userId, "guardar", "documento", docId, { lineas: lineas.length, total: d.total ?? chk.total });
    return { ok: true, id: docId };
  });
  return res;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Borra un albarán guardado y deshace su efecto en stock, PMP, precios y costes. */
export async function borrarDocumento(ctx: AppCtx, docId: string): Promise<void> {
  const keys = await withTenant(ctx.tenantId, async (c) => {
    const doc = await one<{ id: string; status: string; local_id: string }>(c, "select id, status, local_id from documentos where id = $1 for update", [docId]);
    if (!doc || doc.local_id !== ctx.local.id) throw new UserError("Documento no encontrado.");
    const arts = (await all<{ articulo_id: string }>(c, "select distinct articulo_id from compra_lineas where documento_id = $1", [docId])).map((r) => r.articulo_id);
    const pairs = await all<{ articulo_id: string; proveedor_id: string }>(c, "select articulo_id, proveedor_id from articulo_proveedor where documento_id = $1", [docId]);
    const files = (await all<{ storage_key: string }>(c, "select storage_key from documento_archivos where documento_id = $1", [docId])).map((r) => r.storage_key);
    await c.query("delete from stock_movimientos where ref_id = $1", [docId]);
    await c.query("update articulo_proveedor set documento_id = null where documento_id = $1", [docId]);
    await c.query("delete from documentos where id = $1", [docId]);
    for (const p of pairs) {
      const last = await one<{ unidad_compra: string; factor: number; precio: number; coste_unit: number; fecha: string; documento_id: string }>(c, `
        select cl.unidad_compra, cl.factor, cl.precio, cl.coste_unit, d.fecha, d.id as documento_id from compra_lineas cl join documentos d on d.id = cl.documento_id
        where cl.articulo_id = $1 and d.proveedor_id = $2 and d.status = 'guardado' order by d.fecha desc, d.saved_at desc limit 1`, [p.articulo_id, p.proveedor_id]);
      if (last) await c.query(`update articulo_proveedor set unidad_compra = $3, factor = $4, precio = $5, precio_unit = $6, fecha = $7, documento_id = $8
        where articulo_id = $1 and proveedor_id = $2`, [p.articulo_id, p.proveedor_id, last.unidad_compra, last.factor, last.precio, last.coste_unit, last.fecha, last.documento_id]);
      else await c.query("delete from articulo_proveedor where articulo_id = $1 and proveedor_id = $2 and origen = 'albaran'", [p.articulo_id, p.proveedor_id]);
    }
    for (const a of arts) await rebuildArticulo(c, a);
    if (doc.status === "guardado") await recomputeCosts(c, ctx.local.id);
    await audit(c, ctx.tenantId, ctx.userId, "borrar", "documento", docId, { status: doc.status });
    return files;
  });
  for (const k of keys) await deleteFile(k);
}

/** Documento de compra en blanco para apuntar a mano (opcionalmente con líneas precargadas desde un pedido). */
export async function crearManual(ctx: AppCtx, lineas: { articuloId: string; cantidad: number; precio: number | null }[] = [], proveedorId: string | null = null): Promise<string> {
  return withTenant(ctx.tenantId, async (c) => {
    const arts = lineas.length ? await all<{ id: string; name: string; unit: BaseUnit; iva: number }>(c,
      "select id, name, unit, iva from articulos where id = any($1::uuid[]) and local_id = $2", [lineas.map((l) => l.articuloId), ctx.local.id]) : [];
    const prov = proveedorId ? await one<{ id: string; name: string }>(c, "select id, name from proveedores where id = $1 and local_id = $2", [proveedorId, ctx.local.id]) : null;
    const draft: Draft = {
      proveedor: { nombreLeido: null, cif: null, id: prov?.id ?? null, conf: "alta", nuevo: !prov, nombre: prov?.name ?? "" },
      tipoDocumento: "albaran", duplicado: null, manual: true, resumen: null,
      numero: null, numeroAlt: null, confNumero: "alta", numeroRevisado: true, fecha: isoDate(), confFecha: "alta", total: null, confTotal: "alta",
      desglose: [], observaciones: null,
      lineas: lineas.flatMap((l, i) => {
        const a = arts.find((x) => x.id === l.articuloId);
        if (!a) return [];
        return [{
          id: "m" + (i + 1), texto: a.name, cantidad: l.cantidad, cantidadTexto: String(l.cantidad), unidadCompra: a.unit, factor: 1, factorFuente: "unidad" as const,
          precio: l.precio, descuento: 0, bonificadas: 0, importe: null, ivaLeido: a.iva, iva: a.iva, ivaEsperado: a.iva,
          conf: { linea: "alta" as const, cantidad: "alta" as const, precio: "alta" as const }, duda: null,
          match: { tipo: "tuyo" as const, id: a.id, score: 1, porUsuario: true }, nuevo: null, candidatos: [],
          decisiones: { articulo: false, iva: false, cantidad: false, unidad: false },
          resuelto: { articulo: true, iva: true, cantidad: true, unidad: true }, manual: true,
        }];
      }),
    };
    const r = await one<{ id: string }>(c, `insert into documentos (tenant_id, local_id, kind, status, source, draft, fecha, proveedor_id, created_by)
      values ($1,$2,'albaran','revisar','manual',$3,$4,$5,$6) returning id`, [ctx.tenantId, ctx.local.id, JSON.stringify(draft), isoDate(), prov?.id ?? null, ctx.userId]);
    return r!.id;
  });
}

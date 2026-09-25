// Compras: lectura del documento en segundo plano, confirmación del albarán y borrado con vuelta atrás.
import { all, one, withTenant, type Db } from "../db";
import { readAlbaran, readCarta, type OcrFile } from "../ocr";
import { readFileBytes, deleteFile } from "../storage";
import { hmac } from "../crypto";
import { audit } from "../audit";
import { UserError, type AppCtx } from "../ctx";
import { getCatalog } from "../queries/catalog";
import { recomputeCosts } from "./costs";
import { aliasDe, aprenderAlias, articuloDesdeCatalogo, crearArticulo, rebuildArticulo } from "./articulos";
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

/** Fecha AAAA-MM-DD que existe (Date convierte el 31 de junio en 1 de julio; Postgres la rechaza) y es razonable. */
export const validDate = (s: string | null | undefined) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  const now = Date.now();
  if (d.getTime() > now + 3 * 864e5 || d.getTime() < now - 3 * 365 * 864e5) return null;
  return s;
};

/** Lee el documento (en segundo plano tras la subida) y deja el borrador listo para revisar. */
export async function processDocumento(tenantId: string, docId: string): Promise<void> {
  const doc = await withTenant(tenantId, (c) => one<{ id: string; kind: string; status: string; local_id: string; local_name: string; intento: string }>(c,
    "select d.id, d.kind, d.status, d.local_id, l.name as local_name, d.created_at::text as intento from documentos d join locales l on l.id = d.local_id where d.id = $1", [docId]));
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
      // Sin fecha legible (o imposible, como un 31 de junio): hoy, marcada para que la revisen
      if (!fecha) { draft.fecha = isoDate(); draft.confFecha = "baja"; }
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
    // Solo si sigue leyéndose esta misma lectura: si mientras tanto se pasó a mano, se volvió a leer o se guardó, no se toca
    await withTenant(tenantId, (c) => c.query("update documentos set status = 'error', ocr_error = $2 where id = $1 and status = 'leyendo' and created_at = $3::timestamptz",
      [docId, friendly, doc.intento]));
  }
}

type ConfirmOpts = { forzarTotal?: boolean; forzarDuplicado?: boolean };
export type ConfirmResult = { ok: true; id: string } | { ok: false; error: string; kind?: "total" | "duplicado" | "pendientes"; diff?: number };
/** Lo que un albarán enseñó a los artículos al guardarse, para deshacerlo si se borra. */
type Aprendido = { aliases: { id: string; alias: string }[]; iva: { id: string; antes: number; ahora: number }[] };
const num = (n: unknown, min: number, max: number): n is number => typeof n === "number" && n >= min && n <= max;
/** Solo los precios de albaranes reales leídos del documento van a la capa anónima: ni ejemplos, ni datos de prueba, ni apuntes a mano. */
const aportaBench = (doc: { demo: boolean; source: string; ocr_model: string | null }) =>
  !doc.demo && doc.source === "ocr" && doc.ocr_model !== "ejemplo" && doc.ocr_model !== "mock";
const benchRef = (tenantId: string, docId: string) => hmac("bench-doc:" + tenantId + ":" + docId);
/** Variación que se registra como subida o bajada: desde el 0,5 %; las de miles de veces son errores de lectura o conversión (y no caben en la columna). */
const cambioPrecio = (v: number) => Math.abs(v) >= 0.005 && Math.abs(v) < 1e4;

export async function confirmarAlbaran(ctx: AppCtx, docId: string, input: Draft, opts: ConfirmOpts): Promise<ConfirmResult> {
  const d: Draft = JSON.parse(JSON.stringify(input));
  const lineas = d.lineas.filter((l) => !l.ignorar);
  if (!lineas.length) return { ok: false, error: "El albarán no tiene líneas de producto." };
  const pend = d.lineas.reduce((n, l) => n + pendientes(l).length, 0);
  if (pend) return { ok: false, error: `Quedan ${pend} decisiones por tomar.`, kind: "pendientes" };
  for (const l of lineas) {
    if (!l.match?.id && !(l.match?.tipo === "nuevo" && l.nuevo)) return { ok: false, error: `Falta el artículo de «${l.texto}».`, kind: "pendientes" };
    // Límites de las columnas y de lo razonable: fuera de ellos habría costes negativos o disparatados en stock, PMP y escandallos
    if (!num(l.cantidad, 0, 1e6) || !(l.cantidad > 0)) return { ok: false, error: `Revisa la cantidad de «${l.texto}».`, kind: "pendientes" };
    if (!num(l.precio, 0, 1e6)) return { ok: false, error: `Revisa el precio de «${l.texto}».`, kind: "pendientes" };
    if (!num(l.factor, 0, 1e5) || !(l.factor > 0)) return { ok: false, error: `Falta la conversión de unidades de «${l.texto}».`, kind: "pendientes" };
    if (!num(l.descuento || 0, 0, 100)) return { ok: false, error: `Revisa el descuento de «${l.texto}» (entre 0 y 100 %).`, kind: "pendientes" };
    if (!num(l.bonificadas || 0, 0, 1e6)) return { ok: false, error: `Revisa las unidades de regalo de «${l.texto}».`, kind: "pendientes" };
    const lc = lineaCoste(l.cantidad, l.precio, l.descuento || 0, l.bonificadas || 0, l.factor);
    if (!(lc.importe < 1e9 && lc.unidades < 1e9 && lc.costeUnit < 1e7)) return { ok: false, error: `Revisa las cifras de «${l.texto}»: son demasiado grandes.`, kind: "pendientes" };
    const iva = l.iva ?? l.ivaLeido ?? l.ivaEsperado;
    if (!Number.isInteger(iva) || iva! < 0 || iva! > 30) return { ok: false, error: `Falta el IVA de «${l.texto}».`, kind: "pendientes" };
  }
  if (d.total != null && !num(d.total, -1e9, 1e9)) return { ok: false, error: "Revisa el total del documento.", kind: "pendientes" };
  const chk = draftCheck(d);
  if (d.total != null && !chk.cuadra && !opts.forzarTotal) return { ok: false, error: "El total no cuadra con el del documento.", kind: "total", diff: chk.diff ?? 0 };
  const provName = (d.proveedor.nombre || prettyName(d.proveedor.nombreLeido ?? "")).trim();
  if (!d.proveedor.id && provName.length < 2) return { ok: false, error: "Indica el proveedor.", kind: "pendientes" };
  const fecha = validDate(d.fecha) ?? isoDate();
  const fechaTs = new Date(fecha + "T12:00:00Z");

  const res = await withTenant(ctx.tenantId, async (c): Promise<ConfirmResult & { keys?: string[] }> => {
    const doc = await one<{ id: string; status: string; local_id: string; demo: boolean; source: string; ocr_model: string | null; saved_by: string | null }>(c,
      "select id, status, local_id, demo, source, ocr_model, saved_by from documentos where id = $1 for update", [docId]);
    if (!doc || doc.local_id !== ctx.local.id) throw new UserError("Documento no encontrado.");
    // Ya guardado: si fue esta persona es un reintento (doble clic, red lenta); si fue otra, sus correcciones no se aplicarían sin avisar
    if (doc.status === "guardado") return doc.saved_by && doc.saved_by !== ctx.userId
      ? { ok: false, error: "Otra persona ya ha guardado este albarán mientras lo revisabas y tus cambios no se han aplicado. Recarga la página para ver cómo ha quedado." }
      : { ok: true, id: docId };
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
    const artCache = new Map<string, { name: string; unit: string; iva: number; last_price: number | null; last_purchase_at: Date | null; catalog_item_id: string | null }>();
    const aprendido: Aprendido = { aliases: [], iva: [] };
    const { items } = await getCatalog();
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
        const a = await one<{ name: string; unit: string; iva: number; last_price: number | null; last_purchase_at: Date | null; catalog_item_id: string | null }>(c,
          "select name, unit, iva, last_price, last_purchase_at, catalog_item_id from articulos where id = $1", [artId]);
        artCache.set(artId, a!);
      }
      const art = artCache.get(artId)!;
      // La conversión de la línea se calculó para la unidad del artículo nuevo o del catálogo: aplicada a otra unidad corrompería stock y PMP
      const unidad = l.match!.tipo === "nuevo" ? l.nuevo!.unit : l.match!.tipo === "catalogo" ? items.find((i) => i.id === l.match!.id)?.unit : null;
      if (unidad && art.unit !== unidad) throw new UserError(`«${art.name}» ya existe y se mide en ${art.unit}, no en ${unidad}. Elígelo en la línea «${l.texto}» para ajustar la conversión.`);
      if (l.texto && !l.manual) {
        const alias = await aprenderAlias(c, artId, l.texto);
        if (alias) aprendido.aliases.push({ id: artId, alias });
      }
      const iva = (l.iva ?? l.ivaLeido ?? l.ivaEsperado)!;
      // Si el usuario ha confirmado un IVA distinto del del artículo, el artículo lo aprende y no se vuelve a preguntar
      if (l.decisiones.iva && l.iva != null && (await c.query("update articulos set iva = $2 where id = $1 and iva <> $2", [artId, l.iva])).rowCount) {
        const x = aprendido.iva.find((v) => v.id === artId);
        if (x) x.ahora = l.iva; else aprendido.iva.push({ id: artId, antes: art.iva, ahora: l.iva });
      }
      const lc = lineaCoste(l.cantidad!, l.precio!, l.descuento || 0, l.bonificadas || 0, l.factor!);
      await c.query(`insert into compra_lineas (tenant_id, documento_id, idx, texto, articulo_id, cantidad, unidad_compra, factor, precio, descuento, bonificadas, importe, iva, coste_unit)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [ctx.tenantId, docId, idx++, l.texto.slice(0, 200), artId, l.cantidad, (l.unidadCompra || art.unit).slice(0, 40), l.factor, l.precio, l.descuento || 0, l.bonificadas || 0, lc.importe, iva, lc.costeUnit]);
      await c.query(`insert into stock_movimientos (tenant_id, local_id, articulo_id, tipo, cantidad, coste_unit, ref_tipo, ref_id, fecha, created_by)
        values ($1,$2,$3,'compra',$4,$5,'documento',$6,$7,$8)`, [ctx.tenantId, ctx.local.id, artId, lc.unidades, lc.costeUnit, docId, fechaTs, ctx.userId]);
      await c.query(`insert into articulo_proveedor (tenant_id, articulo_id, proveedor_id, unidad_compra, factor, precio, precio_unit, fecha, documento_id, origen, nota)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'albaran','')
        on conflict (articulo_id, proveedor_id) do update set unidad_compra = excluded.unidad_compra, factor = excluded.factor, precio = excluded.precio,
          precio_unit = excluded.precio_unit, fecha = excluded.fecha, documento_id = excluded.documento_id, origen = 'albaran',
          cotizacion_previa = case when articulo_proveedor.origen = 'cotizacion' then jsonb_build_object('unidad_compra', articulo_proveedor.unidad_compra,
            'factor', articulo_proveedor.factor, 'precio', articulo_proveedor.precio, 'precio_unit', articulo_proveedor.precio_unit, 'fecha', articulo_proveedor.fecha)
            else articulo_proveedor.cotizacion_previa end
        where articulo_proveedor.fecha is null or articulo_proveedor.fecha <= excluded.fecha`,
        [ctx.tenantId, artId, provId, (l.unidadCompra || art.unit).slice(0, 40), l.factor, l.precio, lc.costeUnit, fecha, docId]);
      const prev = art.last_price;
      const isNewer = !art.last_purchase_at || fechaTs >= new Date(art.last_purchase_at);
      if (prev != null && prev > 0 && isNewer && !affected.has(artId)) {
        const v = (lc.costeUnit - prev) / prev;
        if (cambioPrecio(v)) {
          await c.query(`insert into precio_eventos (tenant_id, articulo_id, proveedor_id, documento_id, precio_anterior, precio_nuevo, variacion, fecha)
            values ($1,$2,$3,$4,$5,$6,$7,$8)`, [ctx.tenantId, artId, provId, docId, prev, lc.costeUnit, v, fecha]);
          resumen.cambios.push({ id: artId, name: art.name, antes: prev, ahora: lc.costeUnit, variacion: v, unit: art.unit });
        }
      } else if (prev == null && !affected.has(artId)) {
        resumen.primeros.push({ id: artId, name: art.name, precio: lc.costeUnit, unit: art.unit });
      }
      affected.add(artId);
      if (art.catalog_item_id && aportaBench(doc)) {
        await c.query(`insert into bench_price_obs (catalog_item_id, unit, price_per_unit, week, region, contributor, documento_ref)
          values ($1, $2, $3, date_trunc('week', $4::date)::date, left($5, 2), $6, $7)`,
          [art.catalog_item_id, art.unit, lc.costeUnit, fecha, ctx.local.postal_code ?? "", hmac("bench:" + ctx.tenantId), benchRef(ctx.tenantId, docId)]);
      }
    }
    // Se marca guardado antes de recalcular los artículos: su precio pasa a ser la última compra (precio, proveedor y fecha)
    await c.query("update documentos set status = 'guardado', proveedor_id = $2, numero = $3, fecha = $4, saved_at = now(), saved_by = $5 where id = $1",
      [docId, provId, d.numero, fecha, ctx.userId]);
    for (const a of [...affected].sort()) await rebuildArticulo(c, a);
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
    await c.query("update documentos set base = $2, cuota = $3, total = $4, draft = $5, aprendido = $6 where id = $1",
      [docId, round2(chk.base), round2(chk.cuota), round2(d.total ?? chk.total), JSON.stringify(d), JSON.stringify(aprendido)]);
    await audit(c, ctx.tenantId, ctx.userId, "guardar", "documento", docId, { lineas: lineas.length, total: d.total ?? chk.total });
    return { ok: true, id: docId };
  });
  return res;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Borra un albarán guardado y deshace su efecto en stock, PMP, precios, capa anónima, lo aprendido y costes. */
export async function borrarDocumento(ctx: AppCtx, docId: string): Promise<void> {
  const keys = await withTenant(ctx.tenantId, async (c) => {
    const doc = await one<{ id: string; status: string; local_id: string; aprendido: Aprendido | null }>(c,
      "select id, status, local_id, aprendido from documentos where id = $1 for update", [docId]);
    if (!doc || doc.local_id !== ctx.local.id) throw new UserError("Documento no encontrado.");
    const arts = (await all<{ articulo_id: string }>(c, "select distinct articulo_id from compra_lineas where documento_id = $1 order by 1", [docId])).map((r) => r.articulo_id);
    const pairs = await all<{ articulo_id: string; proveedor_id: string }>(c, "select articulo_id, proveedor_id from articulo_proveedor where documento_id = $1", [docId]);
    const files = (await all<{ storage_key: string }>(c, "select storage_key from documento_archivos where documento_id = $1", [docId])).map((r) => r.storage_key);
    // Albaranes guardados después con esos artículos: su subida o bajada de precio se midió quizá contra este
    const despues = arts.length ? await all<{ id: string; articulo_id: string }>(c, `select distinct cl.documento_id as id, cl.articulo_id
      from compra_lineas cl join documentos d on d.id = cl.documento_id
      where cl.articulo_id = any($1::uuid[]) and d.status = 'guardado' and d.saved_at > (select saved_at from documentos where id = $2)`, [arts, docId]) : [];
    // Sus precios salen de la capa anónima (las observaciones anteriores a la referencia se guardaron en la misma transacción que el albarán)
    await c.query(`delete from bench_price_obs where documento_ref = $1
      or (documento_ref is null and contributor = $2 and created_at = (select saved_at from documentos where id = $3))`,
      [benchRef(ctx.tenantId, docId), hmac("bench:" + ctx.tenantId), docId]);
    await c.query("delete from stock_movimientos where ref_id = $1", [docId]);
    await c.query("update articulo_proveedor set documento_id = null where documento_id = $1", [docId]);
    await c.query("delete from documentos where id = $1", [docId]);
    for (const p of pairs) {
      const last = await one<{ unidad_compra: string; factor: number; precio: number; coste_unit: number; fecha: string; documento_id: string }>(c, `
        select cl.unidad_compra, cl.factor, cl.precio, cl.coste_unit, d.fecha, d.id as documento_id from compra_lineas cl join documentos d on d.id = cl.documento_id
        where cl.articulo_id = $1 and d.proveedor_id = $2 and d.status = 'guardado' order by d.fecha desc, d.saved_at desc limit 1`, [p.articulo_id, p.proveedor_id]);
      if (last) await c.query(`update articulo_proveedor set unidad_compra = $3, factor = $4, precio = $5, precio_unit = $6, fecha = $7, documento_id = $8
        where articulo_id = $1 and proveedor_id = $2`, [p.articulo_id, p.proveedor_id, last.unidad_compra, last.factor, last.precio, last.coste_unit, last.fecha, last.documento_id]);
      else {
        // Ya no queda ningún albarán de ese proveedor: vuelve la cotización que había antes, si el albarán la sustituyó
        const r = await c.query(`update articulo_proveedor set unidad_compra = coalesce(cotizacion_previa->>'unidad_compra', ''),
            factor = coalesce((cotizacion_previa->>'factor')::numeric, 1), precio = (cotizacion_previa->>'precio')::numeric,
            precio_unit = (cotizacion_previa->>'precio_unit')::numeric, fecha = (cotizacion_previa->>'fecha')::date, documento_id = null, origen = 'cotizacion', cotizacion_previa = null
          where articulo_id = $1 and proveedor_id = $2 and origen = 'albaran' and cotizacion_previa is not null`, [p.articulo_id, p.proveedor_id]);
        if (!r.rowCount) await c.query("delete from articulo_proveedor where articulo_id = $1 and proveedor_id = $2 and origen = 'albaran'", [p.articulo_id, p.proveedor_id]);
      }
    }
    await olvidar(c, doc.aprendido);
    for (const a of arts) await rebuildArticulo(c, a);
    for (const a of arts) await rehacerEventos(c, ctx.tenantId, a, despues.filter((x) => x.articulo_id === a).map((x) => x.id));
    if (doc.status === "guardado") await recomputeCosts(c, ctx.local.id);
    await audit(c, ctx.tenantId, ctx.userId, "borrar", "documento", docId, { status: doc.status });
    return files;
  });
  for (const k of keys) await deleteFile(k);
}

/** Deshace lo que aprendió un albarán borrado, salvo que otro albarán guardado lo respalde (la misma línea en el mismo artículo). */
async function olvidar(c: Db, ap: Aprendido | null) {
  const lineas = async (id: string) => all<{ texto: string; iva: number }>(c, `select cl.texto, cl.iva from compra_lineas cl join documentos d on d.id = cl.documento_id
    where cl.articulo_id = $1 and d.status = 'guardado'`, [id]);
  for (const x of ap?.aliases ?? []) {
    if (!(await lineas(x.id)).some((l) => aliasDe(l.texto) === x.alias)) await c.query("update articulos set aliases = array_remove(aliases, $2) where id = $1", [x.id, x.alias]);
  }
  for (const x of ap?.iva ?? []) {
    if (!(await lineas(x.id)).some((l) => l.iva === x.ahora)) await c.query("update articulos set iva = $2 where id = $1 and iva = $3", [x.id, x.antes, x.ahora]);
  }
}

/**
 * Rehace las subidas y bajadas de precio de un artículo en albaranes guardados después de uno que se borra, como si
 * ese no hubiera existido: se comparan con la compra más reciente guardada antes que ellos (igual que al guardar).
 */
async function rehacerEventos(c: Db, tenantId: string, articuloId: string, docs: string[]) {
  if (!docs.length) return;
  const rows = await all<{ id: string; proveedor_id: string | null; fecha: string; nuevo: number; antes: number | null; antes_fecha: string | null }>(c, `
    select d.id, d.proveedor_id, d.fecha, cur.coste_unit as nuevo, prev.coste_unit as antes, prev.fecha as antes_fecha
    from documentos d
    join lateral (select coste_unit from compra_lineas where documento_id = d.id and articulo_id = $1 order by idx limit 1) cur on true
    left join lateral (select cl.coste_unit, d2.fecha from compra_lineas cl join documentos d2 on d2.id = cl.documento_id
      where cl.articulo_id = $1 and d2.status = 'guardado' and d2.saved_at < d.saved_at
      order by d2.fecha desc nulls last, d2.saved_at desc, cl.idx limit 1) prev on true
    where d.id = any($2::uuid[]) and d.status = 'guardado'`, [articuloId, docs]);
  for (const r of rows) {
    await c.query("delete from precio_eventos where documento_id = $1 and articulo_id = $2", [r.id, articuloId]);
    if (r.antes == null || !(r.antes > 0) || (r.antes_fecha != null && r.antes_fecha > r.fecha)) continue;
    const v = (r.nuevo - r.antes) / r.antes;
    if (cambioPrecio(v)) await c.query(`insert into precio_eventos (tenant_id, articulo_id, proveedor_id, documento_id, precio_anterior, precio_nuevo, variacion, fecha)
      values ($1,$2,$3,$4,$5,$6,$7,$8)`, [tenantId, articuloId, r.proveedor_id, r.id, r.antes, r.nuevo, v, r.fecha]);
  }
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

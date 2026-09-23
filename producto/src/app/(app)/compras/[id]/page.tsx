import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Screen } from "@/components/shell/screen";
import { all, isUuid, one, withTenant } from "@/server/db";
import { requireApp, hasPerm } from "@/server/ctx";
import { getCatalog } from "@/server/queries/catalog";
import { plantillasConCoste } from "@/server/queries/plantillas";
import { eur, fecha, fechaNum, pct, plural, qty } from "@/lib/format";
import { pvpParaFc } from "@/lib/costing";
import type { Draft } from "@/lib/ocr-types";
import type { BaseUnit } from "@/lib/units";
import { Leyendo } from "./leyendo";
import { ErrorDoc } from "./error-doc";
import { Validacion } from "./validacion";
import { BorrarAlbaran } from "./borrar";

export const metadata = { title: "Documento" };

type Doc = {
  id: string; kind: string; status: string; source: string; proveedor_id: string | null; proveedor: string | null; numero: string | null; fecha: string | null;
  base: number | null; cuota: number | null; total: number | null; draft: Draft | null; created_at: Date; saved_at: Date | null; ocr_model: string | null;
  ocr_ms: number | null; ocr_cost_usd: number | null; ocr_error: string | null; pages: number; created_by_name: string | null;
};

export default async function DocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string }> }) {
  const ctx = await requireApp();
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();
  const data = await withTenant(ctx.tenantId, async (c) => {
    const doc = await one<Doc>(c, `select d.id, d.kind, d.status, d.source, d.proveedor_id, p.name as proveedor, d.numero, d.fecha, d.base, d.cuota, d.total, d.draft,
      d.created_at, d.saved_at, d.ocr_model, d.ocr_ms, d.ocr_cost_usd, d.ocr_error, d.pages, u.name as created_by_name
      from documentos d left join proveedores p on p.id = d.proveedor_id left join users u on u.id = d.created_by where d.id = $1 and d.local_id = $2`, [id, ctx.local.id]);
    if (!doc) return null;
    const files = await all<{ storage_key: string; mime: string; name: string }>(c, "select storage_key, mime, name from documento_archivos where documento_id = $1 order by idx", [id]);
    return { doc, files };
  });
  if (!data) notFound();
  const { doc } = data;
  const files = data.files.map((f) => ({ url: "/api/archivos/" + f.storage_key.split("/").map(encodeURIComponent).join("/"), mime: f.mime, name: f.name }));

  if (doc.status === "subido" || doc.status === "leyendo") {
    return <Leyendo id={doc.id} kind={doc.kind} name={files[0]?.name || "Documento"} pages={doc.pages || files.length} thumb={files.find((f) => f.mime.startsWith("image/"))?.url ?? null} />;
  }
  if (doc.status === "error") return <ErrorDoc id={doc.id} error={doc.ocr_error} canRetry={doc.source === "ocr" && files.length > 0} />;
  if (doc.status === "descartado") redirect("/compras");
  if (doc.kind === "carta") redirect(`/carta/subir/${doc.id}`);

  if (doc.status === "revisar") {
    if (!hasPerm(ctx, "compras")) redirect("/compras");
    const { cats, items } = await getCatalog();
    const refs = await withTenant(ctx.tenantId, async (c) => ({
      arts: await all<{ id: string; name: string; unit: BaseUnit; category_id: string; iva: number; rend: number; aliases: string[] }>(c,
        "select id, name, unit, category_id, iva, rend, aliases from articulos where local_id = $1 and not archived order by name", [ctx.local.id]),
      provs: await all<{ id: string; name: string }>(c, "select id, name from proveedores where local_id = $1 and not archived order by name", [ctx.local.id]),
    }));
    const draft: Draft = doc.draft ?? { proveedor: { nombreLeido: null, cif: null, id: null, conf: "alta", nuevo: true }, numero: null, numeroAlt: null, confNumero: "alta", numeroRevisado: true, fecha: null, confFecha: "alta", total: null, confTotal: "alta", desglose: [], lineas: [], observaciones: null, manual: true };
    return (
      <Validacion docId={doc.id} initial={draft} files={files}
        arts={refs.arts.map((a) => ({ id: a.id, name: a.name, unit: a.unit, categoryId: a.category_id, iva: a.iva, rend: a.rend, aliases: a.aliases }))}
        catalog={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit, categoryId: i.category_id, rend: i.rend, aliases: i.aliases }))}
        cats={cats.map((c) => ({ id: c.id, name: c.name, singular: c.singular, iva: c.iva }))} provs={refs.provs}
        meta={{ ms: doc.ocr_ms, model: doc.ocr_model }} tourSeen={!!ctx.prefs.seen?.validacion} />
    );
  }

  // Guardado
  const det = await withTenant(ctx.tenantId, async (c) => {
    const lineas = await all<{ idx: number; texto: string; articulo_id: string; name: string; unit: BaseUnit; cantidad: number; unidad_compra: string; factor: number; precio: number;
      descuento: number; bonificadas: number; importe: number; iva: number; coste_unit: number; variacion: number | null; antes: number | null }>(c, `
      select cl.idx, cl.texto, cl.articulo_id, a.name, a.unit, cl.cantidad, cl.unidad_compra, cl.factor, cl.precio, cl.descuento, cl.bonificadas, cl.importe, cl.iva, cl.coste_unit,
        pe.variacion, pe.precio_anterior as antes
      from compra_lineas cl join articulos a on a.id = cl.articulo_id
      left join lateral (select variacion, precio_anterior from precio_eventos where documento_id = cl.documento_id and articulo_id = cl.articulo_id limit 1) pe on true
      where cl.documento_id = $1 order by cl.idx`, [id]);
    const others = await all<{ articulo_id: string; proveedor: string; precio_unit: number }>(c, `select ap.articulo_id, p.name as proveedor, ap.precio_unit from articulo_proveedor ap
      join proveedores p on p.id = ap.proveedor_id where ap.articulo_id = any($1::uuid[]) and ap.proveedor_id <> $2 and ap.precio_unit is not null`,
      [lineas.map((l) => l.articulo_id), doc.proveedor_id]);
    const nRecetas = (await one<{ n: number }>(c, "select count(*)::int as n from recetas where local_id = $1 and not archived and tipo <> 'elaboracion'", [ctx.local.id]))?.n ?? 0;
    const tpl = sp.guardado === "1" && nRecetas === 0 ? await plantillasConCoste(c, ctx.local.id) : [];
    return { lineas, others, nRecetas, tpl };
  });
  const res = doc.draft?.resumen ?? null;
  const ignored = (doc.draft?.lineas ?? []).filter((l) => l.ignorar);
  const byIva = new Map<number, number>();
  for (const l of det.lineas) byIva.set(l.iva, (byIva.get(l.iva) ?? 0) + l.importe);
  const title = doc.kind === "factura" ? "Factura" : "Albarán";

  if (sp.guardado === "1") {
    const subidas = (res?.cambios ?? []).filter((x) => x.variacion > 0).sort((a, b) => b.variacion - a.variacion);
    const bajadas = (res?.cambios ?? []).filter((x) => x.variacion < 0);
    const platos = (res?.recetas ?? []).filter((r) => r.antes != null && r.ahora != null && Math.abs((r.ahora ?? 0) - (r.antes ?? 0)) > 0.005);
    const tplOk = det.tpl.filter((t) => t.coste != null).slice(0, 3);
    return (
      <Screen title={`${title} guardado`} task foot={<div className="foot-in"><div className="foot-btns"><Link className="btn btn-3" href="/hoy">Volver a Hoy</Link><Link className="btn" href="/compras/subir"><Icon name="camera" size={18} /> Subir otro</Link></div></div>}>
        <div className="saved-grid">
          <div className="saved-head stack">
            <span className="okmark"><Icon name="check" /></span>
            <div className="saved-h"><h2>{title} guardado</h2><p className="muted">{doc.proveedor} · {fecha(doc.fecha)} · {plural(det.lineas.length, "línea", "líneas")} · {eur(doc.total)}</p></div>
            {res?.proveedorNuevo ? <div className="note note-ok"><Icon name="truck" /><p>{doc.proveedor} se ha añadido a tus proveedores.</p></div> : null}
            {res?.nuevos.length ? <div className="note note-ok"><Icon name="box" /><p>{plural(res.nuevos.length, "artículo nuevo", "artículos nuevos")} en tu lista: {res.nuevos.slice(0, 4).map((n) => n.name).join(", ")}{res.nuevos.length > 4 ? "…" : ""}.</p></div> : null}
          </div>
          <div className="saved-ins stack">
            {subidas.length ? (
              <section className="hero" aria-labelledby="h-ins">
                <p className="eyebrow">Ojo con esto</p>
                <h2 className="hero-t" id="h-ins">{subidas[0].name} sube un {pct(subidas[0].variacion)}: de {eur(subidas[0].antes)} a {eur(subidas[0].ahora)}/{subidas[0].unit}.</h2>
                <p className="hero-p">{subidas.length > 1 ? `Y ${plural(subidas.length - 1, "producto más ha", "productos más han")} subido en este albarán. ` : ""}{platos.length ? `Afecta al coste de ${plural(platos.length, "plato", "platos")}.` : "Aún no afecta a ningún escandallo."}</p>
                <div className="hero-actions"><Link className="btn btn-light" href="/hoy/avisos">Ver el impacto</Link><Link className="btn btn-ghost-light" href={`/articulos/${subidas[0].id}`}>Comparar proveedores</Link></div>
              </section>
            ) : det.nRecetas === 0 ? (
              <section className="hero" aria-labelledby="h-ins">
                <p className="eyebrow">Tu primer dato útil</p>
                <h2 className="hero-t" id="h-ins">{tplOk.length ? "Con estos precios, esto te cuestan unos platos típicos:" : "Ya tienes precios reales. Ahora, tu primer escandallo."}</h2>
                {tplOk.length ? <div className="tpl-list">{tplOk.map((t) => (
                  <Link key={t.key} className="tpl" href={`/escandallos/nuevo?plantilla=${t.key}`}>
                    <span><b>{t.name}</b><small>{eur(t.coste)} por ración · PVP para un food cost del {ctx.local.fc_objetivo} %: {eur(pvpParaFc(t.coste!, ctx.local.fc_objetivo, ctx.local.iva_venta).gross)}</small></span><Icon name="chevR" size={18} />
                  </Link>))}</div> : null}
                <p className="hero-p">Abre uno, ajusta las cantidades a tu receta y guárdalo: será tu primer escandallo.</p>
                {!tplOk.length ? <div className="hero-actions"><Link className="btn btn-light" href="/escandallos/nuevo"><Icon name="book" size={18} /> Crear escandallo</Link></div> : null}
              </section>
            ) : (
              <section className="hero" aria-labelledby="h-ins">
                <p className="eyebrow">Precios al día</p>
                <h2 className="hero-t" id="h-ins">Tus escandallos ya usan estos precios.</h2>
                <p className="hero-p">{bajadas.length ? `${plural(bajadas.length, "producto ha bajado", "productos han bajado")} de precio. ` : ""}Si algún plato se sale de tu food cost objetivo, te lo diremos en Hoy.</p>
                <div className="hero-actions"><Link className="btn btn-light" href="/escandallos">Ver escandallos</Link></div>
              </section>
            )}
            {platos.length ? (
              <section className="card" aria-labelledby="h-chg">
                <div className="card-h"><h2 className="h3" id="h-chg">Ha cambiado el coste de {plural(platos.length, "plato", "platos")}</h2></div>
                <div className="list">{platos.slice(0, 8).map((x) => (
                  <Link key={x.id} className="li" href={`/escandallos/${x.id}`}>
                    <span className={`li-ic ${x.ahora! > x.antes! ? "bad" : "ok"}`}><Icon name={x.ahora! > x.antes! ? "trendUp" : "trendDown"} /></span>
                    <span className="li-main"><b>{x.name}</b><small>Recalculado con los precios de este albarán</small></span>
                    <span className="li-end"><b>{eur(x.ahora)}</b><small>antes {eur(x.antes)}</small></span>
                  </Link>))}</div>
              </section>
            ) : null}
          </div>
          <section className="card saved-prices" aria-labelledby="h-pr">
            <div className="card-h"><h2 className="h3" id="h-pr">Precios de este {title.toLowerCase()}</h2><span className="tag">{det.lineas.length}</span></div>
            <div className="list">{det.lineas.slice(0, 12).map((l) => {
              const other = det.others.filter((o) => o.articulo_id === l.articulo_id).sort((a, b) => a.precio_unit - b.precio_unit)[0];
              const delta = other ? (l.coste_unit - other.precio_unit) / other.precio_unit : null;
              return (
                <Link key={l.idx} className="li" href={`/articulos/${l.articulo_id}`}>
                  <span className="li-main"><b>{l.name}</b><small>{other ? `En ${other.proveedor}: ${eur(other.precio_unit)}/${l.unit}` : l.variacion != null ? `Antes ${eur(l.antes)}/${l.unit}` : "Primer precio registrado"}</small></span>
                  <span className="li-end"><b>{eur(l.coste_unit)}/{l.unit}</b>
                    {delta != null ? <span className={`tag ${delta < 0 ? "tag-ok" : "tag-warn"}`}>{delta < 0 ? "−" : "+"}{pct(Math.abs(delta))} vs {other!.proveedor.split(" ")[0]}</span>
                      : l.variacion != null ? <span className={`tag ${l.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{l.variacion > 0 ? "+" : "−"}{pct(Math.abs(l.variacion))}</span> : null}
                  </span>
                </Link>);
            })}</div>
            <Link className="linkbtn" href="/articulos">Ver todos los artículos <Icon name="arrowR" size={18} /></Link>
          </section>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title={`${title} ${doc.numero ?? ""}`.trim()} sub={`${doc.proveedor ?? "Sin proveedor"} · ${fecha(doc.fecha, { day: "numeric", month: "long", year: "numeric" })}`} back="/compras"
      actions={hasPerm(ctx, "compras") ? <span className="only-wide"><BorrarAlbaran id={doc.id} label={title.toLowerCase()} /></span> : undefined}>
      <div className="list-grid">
        <div className="stack">
          <section className="card">
            <div className="card-h"><h2 className="h3">Líneas</h2><span className="tag">{det.lineas.length}</span></div>
            <div className="tbl-wrap only-wide"><table className="tbl">
              <thead><tr><th>Producto</th><th className="r">Cantidad</th><th className="r">Precio</th><th className="r">Coste neto</th><th className="r">Variación</th><th className="r">IVA</th><th className="r">Importe</th></tr></thead>
              <tbody>{det.lineas.map((l) => (
                <tr key={l.idx}>
                  <td><Link className="link" href={`/articulos/${l.articulo_id}`}>{l.name}</Link><div className="xs muted" style={{ fontFamily: "var(--mono)" }}>{l.texto}</div></td>
                  <td className="r">{qty(l.cantidad)} {l.unidad_compra}{l.bonificadas ? ` +${qty(l.bonificadas)}` : ""}</td>
                  <td className="r">{eur(l.precio, l.precio < 1 ? 3 : 2)}{l.descuento ? <div className="xs muted">−{l.descuento} %</div> : null}</td>
                  <td className="r">{eur(l.coste_unit)}/{l.unit}</td>
                  <td className="r">{l.variacion != null ? <span className={`tag ${l.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{l.variacion > 0 ? "+" : "−"}{pct(Math.abs(l.variacion))}</span> : <span className="muted">=</span>}</td>
                  <td className="r">{l.iva} %</td>
                  <td className="r"><b>{eur(l.importe)}</b></td>
                </tr>))}</tbody>
            </table></div>
            <div className="list only-narrow">{det.lineas.map((l) => (
              <Link key={l.idx} className="li" href={`/articulos/${l.articulo_id}`}>
                <span className="li-main"><b>{l.name}</b><small>{qty(l.cantidad)} {l.unidad_compra} × {eur(l.precio)} · {eur(l.coste_unit)}/{l.unit}</small></span>
                <span className="li-end"><b>{eur(l.importe)}</b>{l.variacion != null ? <span className={`tag ${l.variacion > 0 ? "tag-bad" : "tag-ok"}`}>{l.variacion > 0 ? "+" : "−"}{pct(Math.abs(l.variacion))}</span> : null}</span>
              </Link>))}</div>
            {ignored.length ? <p className="hint">Además: {ignored.map((l) => `${l.texto} (${eur(l.importe)})`).join(", ")} · no son productos, solo cuentan para el total.</p> : null}
          </section>
          <div className="only-narrow">{hasPerm(ctx, "compras") ? <BorrarAlbaran id={doc.id} label={title.toLowerCase()} /> : null}</div>
        </div>
        <div className="stack">
          <section className="card">
            <h2 className="h3">Resumen</h2>
            <dl className="cfg">
              <div><dt>Proveedor</dt><dd>{doc.proveedor_id ? <Link className="link" href={`/proveedores/${doc.proveedor_id}`}>{doc.proveedor}</Link> : "—"}</dd></div>
              <div><dt>Fecha</dt><dd>{fechaNum(doc.fecha)}</dd></div>
              {[...byIva.entries()].sort((a, b) => a[0] - b[0]).map(([r, b]) => <div key={r}><dt>Base {r} %</dt><dd>{eur(b)} · IVA {eur(b * r / 100)}</dd></div>)}
              <div><dt>Base imponible</dt><dd>{eur(doc.base)}</dd></div>
              <div><dt>IVA</dt><dd>{eur(doc.cuota)}</dd></div>
              <div><dt>Total</dt><dd>{eur(doc.total)}</dd></div>
            </dl>
          </section>
          {files.length ? (
            <section className="card">
              <h2 className="h3">Documento original</h2>
              <div className="pages">{files.map((f, i) => (
                <a key={i} className="pg" href={f.url} target="_blank" rel="noopener" aria-label={`Abrir página ${i + 1}`}>
                  {f.mime.startsWith("image/") ? <img src={f.url} alt="" /> : <><Icon name="file" /><span>PDF</span></>}<span className="pg-n">{i + 1}</span>
                </a>))}</div>
            </section>
          ) : null}
          <p className="hint">
            {doc.source === "manual" ? "Apuntado a mano" : `Leído automáticamente${doc.ocr_ms ? ` en ${Math.round(doc.ocr_ms / 1000)} s` : ""}`}
            {doc.created_by_name ? ` por ${doc.created_by_name}` : ""} · guardado el {fecha(doc.saved_at ? new Date(doc.saved_at).toISOString() : null, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.
          </p>
        </div>
      </div>
    </Screen>
  );
}

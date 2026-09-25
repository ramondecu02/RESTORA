"use client";
// Inventario editable en línea: stock (recuento), consumo y mínimo; cobertura, estado y pedido sugerido al momento.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { ArticlePicker, type Picked } from "@/components/pickers";
import { NumInput } from "@/components/ui/num-input";
import { Confirm, Sheet } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { barraCobertura, cantidadPedido, coberturaDias, coberturaMedia, estadoStock } from "@/lib/inventory";
import { eur, eur0, qty, plural } from "@/lib/format";
import type { BaseUnit } from "@/lib/units";
import { ajustarStock, anadirReferencia, dejarDeControlar, guardarParametro, guardarPedido, pedidoAFactura, recibirSugerido, registrarSalida } from "./actions";

type Row = { id: string; name: string; unit: BaseUnit; stock: number; minimo: number | null; consumo: number | null; precio: number | null; categoryId: string; categoria: string; grupo: string; orden: number; proveedor: string | null; proveedorId: string | null; phone: string; email: string };
type Untracked = { id: string; name: string; unit: BaseUnit; categoryId: string; aliases: string[]; stock: number; minimo: number | null; consumo: number | null };
const TIPOS = [["merma", "Merma o mal estado"], ["desecho", "Desecho"], ["invitacion", "Invitación"], ["devolucion", "Devolución al proveedor"], ["perdida", "Pérdida o rotura"]] as const;

export function InvTable({ rows: initial, untracked, catalog, cats, local, pedidos }: {
  rows: Row[]; untracked: Untracked[];
  catalog: { id: string; name: string; unit: BaseUnit; categoryId: string; aliases: string[] }[]; cats: { id: string; name: string }[]; local: string; pedidos: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  // Últimos valores confirmados por el servidor: solo se envía lo que el usuario cambia, y con el valor que veía
  const [base, setBase] = useState(initial);
  const [cat, setCat] = useState<string>("todas");
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState<Picked | null>(null);
  const [addVals, setAddVals] = useState({ stock: 0 as number | null, minimo: 2 as number | null, consumo: 2 as number | null, stockTocado: false });
  const [quitar, setQuitar] = useState<Row | null>(null);
  const [salida, setSalida] = useState<{ id: string; cantidad: number | null; tipo: string; nota: string } | null>(null);
  const [ped, setPed] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();
  const catNames = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);
  const [prev, setPrev] = useState(initial);
  if (prev !== initial) { setPrev(initial); setRows(initial); setBase(initial); }

  const calc = rows.map((r) => {
    const dias = coberturaDias(r.stock, r.consumo);
    const est = estadoStock(r.stock, r.minimo, dias);
    const pedir = cantidadPedido(r.stock, r.minimo, r.consumo);
    return { ...r, dias, est, pedir, valor: r.precio != null ? Math.max(0, r.stock) * r.precio : 0 };
  });
  const bajos = calc.filter((r) => r.est.estado === "crit");
  const sugerido = calc.filter((r) => r.pedir > 0);
  const totalPedido = sugerido.reduce((s, r) => s + r.pedir * (r.precio ?? 0), 0);
  const valor = calc.reduce((s, r) => s + r.valor, 0);
  const cobMedia = coberturaMedia(rows);
  const counts = new Map<string, number>();
  for (const r of calc) counts.set(r.categoryId, (counts.get(r.categoryId) ?? 0) + 1);
  const porCategoria = (a: { orden: number; categoryId: string }, b: { orden: number; categoryId: string }) => a.orden - b.orden || a.categoryId.localeCompare(b.categoryId);
  const catsPresent = [...new Map(calc.map((r) => [r.categoryId, r])).values()].sort(porCategoria);
  // En «Todas», agrupado por categoría (dos categorías pueden compartir orden) y dentro de cada una por días de cobertura
  const shown = (cat === "todas" ? [...calc] : calc.filter((r) => r.categoryId === cat)).sort((a, b) => (cat === "todas" ? porCategoria(a, b) : 0) || a.dias - b.dias);

  const upd = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const onStock = (r: Row, n: number | null) => { if (n == null || n < 0) return; upd(r.id, { stock: n }); };
  const setBaseRow = (id: string, patch: Partial<Row>) => setBase((bs) => bs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  // Al salir de un campo solo se guarda si el valor ha cambiado; si otro lo cambió mientras tanto, el servidor lo rechaza y recargamos
  const commitStock = (r: Row) => {
    const cur = rows.find((x) => x.id === r.id), b = base.find((x) => x.id === r.id);
    if (!cur || !b || cur.stock === b.stock) return;
    start(async () => {
      const res = await ajustarStock(r.id, cur.stock, b.stock);
      if (res.ok) { setBaseRow(r.id, { stock: res.data!.stock }); upd(r.id, { stock: res.data!.stock }); } else { toastError(res.error); router.refresh(); }
    });
  };
  const commitParam = (r: Row, campo: "stock_min" | "consumo_semanal") => {
    const k = campo === "stock_min" ? "minimo" : "consumo";
    const cur = rows.find((x) => x.id === r.id), b = base.find((x) => x.id === r.id);
    if (!cur || !b || cur[k] === b[k]) return;
    const valor = cur[k];
    start(async () => {
      const res = await guardarParametro(r.id, campo, valor, b[k]);
      if (res.ok) setBaseRow(r.id, { [k]: valor }); else { toastError(res.error); router.refresh(); }
    });
  };
  const onPick = (p: Picked) => {
    if (p.tipo === "receta") return;
    // Valores de partida del propio artículo si ya lo tienes; el stock solo se envía si lo cambias
    const u = p.tipo === "tuyo" ? untracked.find((x) => x.id === p.id) : null;
    setAddVals({ stock: u ? u.stock : 0, minimo: u?.minimo ?? 2, consumo: u?.consumo ?? 2, stockTocado: false });
    setAdding(p);
  };
  const openPedido = () => { setPed(Object.fromEntries(sugerido.map((r) => [r.id, r.pedir]))); setPedidoOpen(true); };
  const pedLineas = () => Object.entries(ped).filter(([, q]) => q > 0).map(([articuloId, cantidad]) => ({ articuloId, cantidad }));
  const porProvMap = new Map<string, { name: string; phone: string; email: string; rows: (typeof calc)[number][] }>();
  // Las líneas son las del pedido al abrirlo: vaciar una cantidad no la quita de la lista
  for (const r of calc.filter((x) => x.id in ped)) {
    const k = r.proveedorId ?? "";
    const g = porProvMap.get(k) ?? { name: r.proveedor ?? "Sin proveedor", phone: r.phone, email: r.email, rows: [] };
    g.rows.push(r); porProvMap.set(k, g);
  }
  const porProv = [...porProvMap.values()];
  const texto = (g: (typeof porProv)[number]) => `Hola, soy de ${local}. Pedido:\n` + g.rows.map((r) => `- ${r.name}: ${qty(ped[r.id])} ${r.unit}`).join("\n") + "\nGracias.";

  const statRow = (
    <div className="stats">
      <div className={`stat ${bajos.length ? "bad" : "ok"}`}><span className="stat-k">Bajo mínimo</span><span className="stat-v">{bajos.length}</span><span className="stat-s">de {rows.length} en el almacén</span></div>
      <div className="stat"><span className="stat-k">Pedido sugerido</span><span className="stat-v">{eur0(totalPedido)}</span><span className="stat-s">Para cubrir dos semanas</span></div>
      <div className="stat"><span className="stat-k">Valor del almacén</span><span className="stat-v">{eur0(valor)}</span><span className="stat-s">A precio de compra</span></div>
      <div className="stat"><span className="stat-k">Cobertura media</span><span className="stat-v">{cobMedia == null ? "—" : `${qty(cobMedia, 1)} d`}</span><span className="stat-s">{cobMedia == null ? "Indica el consumo semanal" : "Al ritmo actual"}</span></div>
    </div>
  );

  return (
    <>
      {statRow}
      <div className="row-wrap">
        <button type="button" className="btn btn-sm" disabled={!sugerido.length} onClick={openPedido}><Icon name="cart" size={18} /> Preparar pedido{sugerido.length ? ` (${sugerido.length})` : ""}</button>
        <button type="button" className="btn btn-2 btn-sm" onClick={() => { setAdding(null); setAddOpen(true); }}><Icon name="plus" size={18} /> Añadir referencia</button>
        <button type="button" className="btn btn-2 btn-sm" disabled={!rows.length} onClick={() => setSalida({ id: rows[0]?.id ?? "", cantidad: null, tipo: "merma", nota: "" })}><Icon name="minus" size={18} /> Registrar merma o salida</button>
        <Link className="btn btn-3 btn-sm" href="/inventario/pedidos">Pedidos{pedidos ? ` (${pedidos})` : ""}</Link>
      </div>
      <section className="card" aria-labelledby="h-alm" data-tour="inv">
        <div className="card-h"><h2 className="h3" id="h-alm">Almacén por categorías</h2><span className="muted small">Edita stock, consumo y mínimo: todo se recalcula al momento</span></div>
        <div className="chips" role="tablist" aria-label="Filtrar por categoría">
          <button type="button" role="tab" aria-selected={cat === "todas"} className={`chip ${cat === "todas" ? "is-on" : ""}`} onClick={() => setCat("todas")}>Todas <span className="cnt">{rows.length}</span></button>
          {catsPresent.map((r) => <button type="button" role="tab" key={r.categoryId} aria-selected={cat === r.categoryId} className={`chip ${cat === r.categoryId ? "is-on" : ""}`} onClick={() => setCat(r.categoryId)}>{r.categoria} <span className="cnt">{counts.get(r.categoryId)}</span></button>)}
        </div>
        {!rows.length ? <div className="empty"><span className="li-ic"><Icon name="cart" /></span><b>Aún no controlas stock</b><p>Añade las referencias que quieras vigilar. Las compras de tus albaranes suman stock solas.</p></div> : null}
        {rows.length ? <>
          <div className="tbl-wrap only-wide"><table className="tbl">
            <thead><tr><th>Producto</th><th className="r">Stock</th><th className="r">Consumo/sem</th><th>Cobertura</th><th className="r">Mínimo</th><th>Estado</th><th className="r">A pedir</th><th /></tr></thead>
            <tbody>
              {shown.map((r, i) => {
                const head = cat === "todas" && (i === 0 || shown[i - 1].categoryId !== r.categoryId);
                const grp = head ? calc.filter((x) => x.categoryId === r.categoryId) : [];
                return [
                  head ? <tr key={"g" + r.categoryId} className="grp"><td colSpan={8}>{r.categoria} · {r.grupo} · {plural(grp.length, "ref.", "ref.")} · {eur0(grp.reduce((s, x) => s + x.valor, 0))}</td></tr> : null,
                  <tr key={r.id}>
                    <td><Link className="link" href={`/articulos/${r.id}`}><b>{r.name}</b></Link><div className="xs muted">{r.proveedor ?? "Sin proveedor"}</div></td>
                    <td className="r"><span className="inp-unit" style={{ justifyContent: "flex-end" }}><NumInput className="inp inp-xs inp-num" value={r.stock} onValue={(n) => onStock(r, n)} onBlur={() => commitStock(r)} aria-label={`Stock de ${r.name}`} /><span>{r.unit}</span></span></td>
                    <td className="r"><NumInput className="inp inp-xs inp-num" value={r.consumo} onValue={(n) => upd(r.id, { consumo: n })} onBlur={() => commitParam(r, "consumo_semanal")} aria-label={`Consumo semanal de ${r.name}`} /></td>
                    <td><div className="cov"><div className={`bar ${r.est.estado === "crit" ? "bad" : r.est.estado}`}><i style={{ width: `${barraCobertura(r.dias)}%` }} /></div><span>{r.dias >= 99 ? "—" : `${qty(r.dias, 0)} d`}</span></div></td>
                    <td className="r"><NumInput className="inp inp-xs inp-num" value={r.minimo} onValue={(n) => upd(r.id, { minimo: n })} onBlur={() => commitParam(r, "stock_min")} aria-label={`Mínimo de ${r.name}`} /></td>
                    <td><span className={`tag ${r.est.estado === "crit" ? "tag-bad" : r.est.estado === "warn" ? "tag-warn" : "tag-ok"}`}>{r.est.label}</span></td>
                    <td className="r">{r.pedir ? <b>{eur(r.pedir * (r.precio ?? 0))}</b> : <span className="muted">—</span>}</td>
                    <td><button type="button" className="iconbtn iconbtn-sm iconbtn-danger" aria-label={`Quitar ${r.name} del inventario`} onClick={() => setQuitar(r)}><Icon name="close" size={16} /></button></td>
                  </tr>,
                ];
              })}
            </tbody>
          </table></div>
          <div className="mcard-list only-narrow">
            {shown.map((r) => (
              <div className="mcard" key={r.id}>
                <div className="mcard-h"><div><Link className="link" href={`/articulos/${r.id}`}><b>{r.name}</b></Link><div className="xs muted">{r.categoria} · {r.proveedor ?? "Sin proveedor"}</div></div><span className={`tag ${r.est.estado === "crit" ? "tag-bad" : r.est.estado === "warn" ? "tag-warn" : "tag-ok"}`}>{r.est.label}</span></div>
                <div className="cov"><div className={`bar ${r.est.estado === "crit" ? "bad" : r.est.estado}`}><i style={{ width: `${barraCobertura(r.dias)}%` }} /></div><span>{r.dias >= 99 ? "sin consumo" : `${qty(r.dias, 0)} días`}</span></div>
                <div className="mcard-g">
                  <div className="fld"><label>Stock ({r.unit})</label><NumInput className="inp inp-xs inp-num" value={r.stock} onValue={(n) => onStock(r, n)} onBlur={() => commitStock(r)} aria-label={`Stock de ${r.name}`} /></div>
                  <div className="fld"><label>Consumo/sem</label><NumInput className="inp inp-xs inp-num" value={r.consumo} onValue={(n) => upd(r.id, { consumo: n })} onBlur={() => commitParam(r, "consumo_semanal")} /></div>
                  <div className="fld"><label>Mínimo</label><NumInput className="inp inp-xs inp-num" value={r.minimo} onValue={(n) => upd(r.id, { minimo: n })} onBlur={() => commitParam(r, "stock_min")} /></div>
                </div>
                {r.pedir ? <p className="xs">A pedir: <b>{qty(r.pedir)} {r.unit}</b> · {eur(r.pedir * (r.precio ?? 0))}</p> : null}
              </div>
            ))}
          </div>
          {!shown.length ? <p className="muted small">No hay referencias en esta categoría.</p> : null}
        </> : null}
      </section>

      <Confirm open={!!quitar} onClose={() => setQuitar(null)} title={`¿Quitar ${quitar?.name ?? ""} del inventario?`} confirm="Quitar" busy={pending}
        text="Deja de salir en el almacén y en el pedido sugerido. El artículo conserva su stock, mínimo y consumo: si lo vuelves a añadir, siguen ahí."
        onConfirm={() => start(async () => { const res = await dejarDeControlar(quitar!.id); if (res.ok) { toast(res.msg ?? "Quitado"); setQuitar(null); } else toastError(res.error); })} />

      <Sheet open={pedidoOpen} onClose={() => setPedidoOpen(false)} title="Pedido sugerido" sub="Lo que falta para cubrir dos semanas de consumo sin bajar del mínimo" wide
        foot={<>
          <button type="button" className="btn btn-3" onClick={() => setPedidoOpen(false)}>Cerrar</button>
          <button type="button" className="btn btn-2" disabled={pending || !pedLineas().length} onClick={() => start(async () => { const r = await pedidoAFactura(null, pedLineas()); if (r && !r.ok) toastError(r.error); })}>Registrar como factura</button>
          <button type="button" className="btn btn-2" disabled={pending || !pedLineas().length} onClick={() => start(async () => { const r = await recibirSugerido(pedLineas()); if (r.ok) { toast(r.msg ?? "Recibido"); setPedidoOpen(false); } else toastError(r.error); })}>Recibir pedido</button>
          <button type="button" className="btn" disabled={pending || !pedLineas().length} onClick={() => start(async () => { const r = await guardarPedido(pedLineas()); if (r.ok) { toast(r.msg ?? "Guardado"); setPedidoOpen(false); } else toastError(r.error); })}>Guardar pedido</button>
        </>}>
        {porProv.map((g) => (
          <section key={g.name} className="card">
            <div className="card-h"><h3 className="h3">{g.name}</h3>
              <span className="row-wrap">
                {g.phone ? <a className="btn btn-2 btn-xs" href={`https://wa.me/${g.phone.replace(/\D/g, "").replace(/^(?!34)(\d{9})$/, "34$1")}?text=${encodeURIComponent(texto(g))}`} target="_blank" rel="noopener"><Icon name="whatsapp" size={16} /> WhatsApp</a> : null}
                {g.email ? <a className="btn btn-2 btn-xs" href={`mailto:${g.email}?subject=${encodeURIComponent("Pedido " + local)}&body=${encodeURIComponent(texto(g))}`}><Icon name="mail" size={16} /> Email</a> : null}
              </span></div>
            <div className="list">{g.rows.map((r) => (
              <div className="li" key={r.id}>
                <span className="li-main"><b>{r.name}</b><small>Tienes {qty(r.stock)} {r.unit} · mínimo {qty(r.minimo)}{r.consumo ? ` · gastas ${qty(r.consumo)}/semana` : ""}</small></span>
                <span className="inp-unit"><NumInput className="inp inp-xs inp-num" value={ped[r.id]} onValue={(n) => setPed((p) => ({ ...p, [r.id]: Math.max(0, n ?? 0) }))} aria-label={`Cantidad de ${r.name}`} /><span>{r.unit}</span></span>
                <span className="li-end"><b>{eur((ped[r.id] ?? 0) * (r.precio ?? 0))}</b></span>
              </div>))}</div>
          </section>
        ))}
        {!porProv.length ? <p className="muted">No hace falta pedir nada.</p> : null}
        <div className="mini-sum"><span>Total estimado</span><b>{eur(calc.reduce((s, r) => s + (ped[r.id] ?? 0) * (r.precio ?? 0), 0))}</b></div>
        <p className="hint">RESTORA no envía pedidos por ti: prepara el texto y lo mandas tú. «Recibir pedido» suma ya el stock, sin tocar precios: úsalo solo si la mercancía llega sin albarán, porque al guardar un albarán su stock se suma solo. «Registrar como factura» abre una compra con estas líneas para ajustar precios reales.</p>
      </Sheet>

      <ArticlePicker open={addOpen && !adding} onClose={() => setAddOpen(false)} title="Añadir al inventario"
        arts={untracked} catalog={catalog} cats={catNames} onPick={onPick} />
      <Sheet open={addOpen && !!adding} onClose={() => { setAdding(null); setAddOpen(false); }} title={adding?.name ?? ""} sub="Valores de partida: los puedes cambiar luego"
        foot={<><button type="button" className="btn btn-3" onClick={() => setAdding(null)}>Atrás</button>
          <button type="button" className="btn" disabled={pending} onClick={() => start(async () => {
            const r = await anadirReferencia({ tipo: adding!.tipo as "tuyo" | "catalogo", id: adding!.id, stock: addVals.stockTocado ? addVals.stock : null, minimo: addVals.minimo, consumo: addVals.consumo });
            if (r.ok) { toast(`${adding!.name} añadido`); setAdding(null); setAddOpen(false); } else toastError(r.error);
          })}>Añadir al almacén</button></>}>
        <div className="fgrid fgrid-3">
          <div className="fld"><label htmlFor="ad-s">Stock actual ({adding?.unit})</label><NumInput id="ad-s" value={addVals.stock} onValue={(n) => setAddVals({ ...addVals, stock: n, stockTocado: true })} />
            {adding?.tipo === "tuyo" ? <p className="hint">El que tiene ahora. Cámbialo solo si lo has contado.</p> : null}</div>
          <div className="fld"><label htmlFor="ad-m">Mínimo</label><NumInput id="ad-m" value={addVals.minimo} onValue={(n) => setAddVals({ ...addVals, minimo: n })} /></div>
          <div className="fld"><label htmlFor="ad-c">Consumo/semana</label><NumInput id="ad-c" value={addVals.consumo} onValue={(n) => setAddVals({ ...addVals, consumo: n })} /></div>
        </div>
      </Sheet>

      <Sheet open={!!salida} onClose={() => setSalida(null)} title="Registrar merma o salida" sub="Resta del stock lo que no se ha vendido"
        foot={<><button type="button" className="btn btn-3" onClick={() => setSalida(null)}>Cancelar</button>
          <button type="button" className="btn" disabled={pending || !(salida?.cantidad && salida.cantidad > 0)} onClick={() => start(async () => {
            const r = await registrarSalida({ id: salida!.id, cantidad: salida!.cantidad!, tipo: salida!.tipo, nota: salida!.nota });
            if (r.ok) { toast(r.msg ?? "Registrado"); const q = salida!.cantidad!; const st = (base.find((x) => x.id === salida!.id)?.stock ?? 0) - q; upd(salida!.id, { stock: st }); setBaseRow(salida!.id, { stock: st }); setSalida(null); } else toastError(r.error);
          })}>Registrar</button></>}>
        {salida ? <div className="stack-sm">
          <div className="fld"><label htmlFor="sa-a">Producto</label><select id="sa-a" className="inp" value={salida.id} onChange={(e) => setSalida({ ...salida, id: e.target.value })}>{rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="fgrid fgrid-2">
            <div className="fld"><label htmlFor="sa-q">Cantidad ({rows.find((r) => r.id === salida.id)?.unit})</label><NumInput id="sa-q" value={salida.cantidad} onValue={(n) => setSalida({ ...salida, cantidad: n })} /></div>
            <div className="fld"><label htmlFor="sa-t">Motivo</label><select id="sa-t" className="inp" value={salida.tipo} onChange={(e) => setSalida({ ...salida, tipo: e.target.value })}>{TIPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <div className="fld"><label htmlFor="sa-n">Nota (opcional)</label><input id="sa-n" className="inp" value={salida.nota} onChange={(e) => setSalida({ ...salida, nota: e.target.value })} /></div>
        </div> : null}
      </Sheet>
    </>
  );
}

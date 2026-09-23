"use client";
// Comparativa del mismo artículo entre proveedores: el más barato, el ahorro al año y el cambio con un clic.
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { Sheet } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { eur, eur0, fecha, pct, qty } from "@/lib/format";
import { cambiarProveedor, guardarCotizacion, quitarCotizacion } from "../actions";

type P = { id: string; name: string; precio: number | null; fecha: string | null; origen: "albaran" | "cotizacion"; nota: string; entrega: string; unidad: string; factor: number };

export function ProvCompare({ articuloId, unit, provs, allProvs, actual, consumo, fcNow, fcAlt, precioActual, canEdit }: {
  articuloId: string; unit: string; provs: P[]; allProvs: { id: string; name: string }[]; actual: string | null;
  consumo: { anual: number; fuente: string } | null; fcNow: number | null; fcAlt: Record<string, number | null>; precioActual: number | null; canEdit: boolean;
}) {
  const [cambio, setCambio] = useState<P | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cot, setCot] = useState({ proveedorId: "", proveedorNuevo: "", precio: null as number | null, unidad: unit, nota: "" });
  const [pending, start] = useTransition();
  const priced = provs.filter((p) => p.precio != null);
  const best = priced.length ? priced.reduce((a, b) => (a.precio! <= b.precio! ? a : b)) : null;
  const cur = provs.find((p) => p.id === actual) ?? null;
  const max = Math.max(1e-9, ...priced.map((p) => p.precio!));
  const ahorroUd = cur?.precio != null && best && best.id !== cur.id ? cur.precio - best.precio! : 0;
  const ahorroAnual = consumo && ahorroUd > 0 ? ahorroUd * consumo.anual : null;

  return (
    <section className="card" aria-labelledby="h-cmp">
      <div className="card-h"><h2 className="h3" id="h-cmp">Comparar proveedores</h2>{canEdit ? <button type="button" className="btn btn-2 btn-xs" onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> Añadir precio</button> : null}</div>
      {priced.length ? (
        <>
          <div className="cmp">
            {priced.map((p) => (
              <div className="cmp-row" key={p.id}>
                <div className="cmp-l">
                  <b>{p.name}{p.id === actual ? <span className="tag" style={{ marginLeft: 6 }}>Actual</span> : null}{best?.id === p.id && priced.length > 1 ? <span className="tag tag-ok" style={{ marginLeft: 6 }}>Mejor</span> : null}</b>
                  <span>{eur(p.precio)}/{unit}</span>
                </div>
                <div className="cmp-track"><div className={`cmp-fill ${best?.id === p.id ? "best" : p.id === actual ? "acc" : ""}`} style={{ width: `${(p.precio! / max) * 100}%` }} /></div>
                <div className="row-sb xs muted">
                  <span>{p.origen === "cotizacion" ? `Cotización${p.nota ? ` · ${p.nota}` : ""}` : `Último albarán ${fecha(p.fecha)}`}{p.entrega ? ` · entrega ${p.entrega}` : ""}</span>
                  <span className="row-wrap">
                    {canEdit && p.id !== actual && cur?.precio != null ? (p.precio! < cur.precio ? <button type="button" className="linkbtn" style={{ minHeight: 32 }} onClick={() => setCambio(p)}>Cambiar a este <Icon name="arrowR" size={16} /></button> : <span>+{eur(p.precio! - cur.precio)} más caro</span>) : null}
                    {canEdit && p.origen === "cotizacion" ? <button type="button" className="iconbtn iconbtn-sm iconbtn-danger" aria-label={`Quitar precio de ${p.name}`} onClick={() => start(async () => { await quitarCotizacion(articuloId, p.id); })}><Icon name="trash" size={16} /></button> : null}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {priced.length > 1 ? (ahorroAnual ? (
            <div className="save-box"><b>{eur0(ahorroAnual)}</b><span>al año si compras a {best!.name}: {eur(ahorroUd)} menos por {unit} con un consumo de unos {qty(consumo!.anual, 0)} {unit}/año.</span></div>
          ) : <div className="note note-ok"><Icon name="check" /><p>{cur && best && cur.id === best.id ? "Tu proveedor actual es el más barato de los comparados." : "Añade el consumo semanal o úsalo en recetas para estimar el ahorro al año."}</p></div>) : <p className="hint">Añade el precio de otro proveedor para compararlo.</p>}
        </>
      ) : <p className="muted small">Aún no hay precios de proveedores. Llegan con los albaranes, o añade una cotización.</p>}

      <Sheet open={!!cambio} onClose={() => setCambio(null)} title="Cambiar de proveedor" sub={cambio ? `${cambio.name} para este artículo` : ""}
        foot={<><button type="button" className="btn btn-3" onClick={() => setCambio(null)}>Cancelar</button>
          <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { const r = await cambiarProveedor(articuloId, cambio!.id); if (r.ok) { toast(r.msg ?? "Cambiado"); setCambio(null); } else toastError(r.error); })}>{pending ? <span className="spin" /> : null}Confirmar cambio</button></>}>
        {cambio ? <div className="stack-sm">
          <dl className="cfg">
            <div><dt>Precio ahora</dt><dd>{eur(precioActual)}/{unit}</dd></div>
            <div><dt>Nuevo precio</dt><dd>{eur(cambio.precio)}/{unit}</dd></div>
            <div><dt>Food cost de la carta</dt><dd>{pct(fcNow)} → {pct(fcAlt[cambio.id] ?? null)}</dd></div>
          </dl>
          {consumo && precioActual != null ? <div className={`fcr ${cambio.precio! < precioActual ? "fcr-ok" : "fcr-bad"}`}><Icon name={cambio.precio! < precioActual ? "check" : "alert"} />
            <p>{cambio.precio! < precioActual ? `Ahorras unos ${eur0((precioActual - cambio.precio!) * consumo.anual)} al año con tu consumo actual (${qty(consumo.anual, 0)} ${unit}).` : `Es unos ${eur0((cambio.precio! - precioActual) * consumo.anual)} más caro al año.`}{cambio.entrega ? ` Entrega: ${cambio.entrega}.` : ""}</p></div> : null}
          <p className="hint">Tus escandallos pasan a usar este precio ya. Cuando llegue el primer albarán de {cambio.name}, mandará el precio real. El proveedor anterior queda guardado en la comparativa.</p>
        </div> : null}
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Añadir precio de otro proveedor" sub="Una cotización o un precio que te han pasado"
        foot={<><button type="button" className="btn btn-3" onClick={() => setAddOpen(false)}>Cancelar</button>
          <button type="button" className="btn" disabled={pending || !(cot.precio && cot.precio > 0)} onClick={() => start(async () => {
            const r = await guardarCotizacion(articuloId, { proveedorId: cot.proveedorId || null, proveedorNuevo: cot.proveedorNuevo, precio: cot.precio!, unidad: cot.unidad, nota: cot.nota });
            if (r.ok) { toast(r.msg ?? "Guardado"); setAddOpen(false); setCot({ proveedorId: "", proveedorNuevo: "", precio: null, unidad: unit, nota: "" }); } else toastError(r.error);
          })}>Guardar precio</button></>}>
        <div className="stack-sm">
          <div className="fld"><label htmlFor="c-p">Proveedor</label>
            <select id="c-p" className="inp" value={cot.proveedorId} onChange={(e) => setCot({ ...cot, proveedorId: e.target.value })}>
              <option value="">Otro proveedor (escríbelo)…</option>{allProvs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          {!cot.proveedorId ? <div className="fld"><label htmlFor="c-n">Nombre del proveedor</label><input id="c-n" className="inp" value={cot.proveedorNuevo} onChange={(e) => setCot({ ...cot, proveedorNuevo: e.target.value })} /></div> : null}
          <div className="fld"><label htmlFor="c-pr">Precio por {unit} (sin IVA)</label><NumInput id="c-pr" className="inp" decimals={4} value={cot.precio} onValue={(n) => setCot({ ...cot, precio: n })} /></div>
          <div className="fld"><label htmlFor="c-no">Nota</label><input id="c-no" className="inp" placeholder="Ej.: pieza de 400–600 g, pedido mínimo 150 €" value={cot.nota} onChange={(e) => setCot({ ...cot, nota: e.target.value })} /></div>
        </div>
      </Sheet>
    </section>
  );
}

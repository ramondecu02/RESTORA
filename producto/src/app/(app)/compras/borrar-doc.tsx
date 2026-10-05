"use client";
// Borrar un documento de compras. Un albarán guardado toca el stock, el precio medio, el coste de los platos y, si ya se
// importaron ventas con esos precios, su coste congelado: antes de borrarlo se enseña qué cambia exactamente (lo calcula el
// servidor simulando el borrado, sin guardar nada) y se pide confirmar. Lo que aún no está guardado solo se descarta.
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Confirm, Sheet } from "@/components/ui/sheet";
import { toastError } from "@/components/ui/toast";
import { eur, fecha, plural, qty } from "@/lib/format";
import type { ImpactoBorrado } from "@/server/domain/compras";
import { borrar, descartar, impactoBorrado } from "./actions";

type Variant = "btn" | "link" | "icon";
const VISIBLES = 4;
const mueve = (a: number | null, b: number | null) => (a == null) !== (b == null) || (a != null && b != null && Math.abs(a - b) > 0.0005);

export function BorrarDoc({ id, status, kind = "albaran", variant = "btn", label }: { id: string; status: string; kind?: string; variant?: Variant; label?: string }) {
  const guardado = status === "guardado";
  const nombre = kind === "factura" ? "factura" : kind === "carta" ? "carta" : "albarán";
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ImpactoBorrado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eleccion, setEleccion] = useState<"dejar" | "recalcular" | null>(null);
  const [todo, setTodo] = useState(false);
  const [intento, setIntento] = useState(0);
  const [pending, start] = useTransition();

  // Al abrir, el servidor mide el impacto con el estado de ese momento (stock, precios y ventas pueden haber cambiado)
  useEffect(() => {
    if (!open || !guardado) return;
    let vivo = true;
    impactoBorrado(id)
      .then((r) => { if (!vivo) return; if (r.ok && r.data) setData(r.data); else setError(r.ok ? "No hemos podido calcular qué cambia." : r.error); })
      .catch(() => { if (vivo) setError("No hemos podido calcular qué cambia. Inténtalo de nuevo."); });
    return () => { vivo = false; };
  }, [open, guardado, id, intento]);

  const cerrar = () => { setOpen(false); setData(null); setError(null); setEleccion(null); setTodo(false); };
  const reintentar = () => { setError(null); setData(null); setIntento((n) => n + 1); };
  const confirmar = () => start(async () => {
    const r = guardado ? await borrar(id, data?.ventas.length ? eleccion ?? undefined : undefined) : await descartar(id, kind === "carta" ? "/carta" : "/compras");
    if (r && !r.ok) { toastError(r.error); if (guardado) cerrar(); }
  });

  const texto = label ?? (guardado ? `Borrar ${nombre}` : `Descartar ${nombre}`);
  const trigger = variant === "icon"
    ? <button type="button" className="iconbtn iconbtn-sm iconbtn-danger" onClick={() => setOpen(true)} aria-label={texto} title={texto}><Icon name="trash" size={18} /></button>
    : variant === "link"
      ? <button type="button" className="linkbtn linkbtn-bad" onClick={() => setOpen(true)}><Icon name="trash" size={16} /> {texto}</button>
      : <button type="button" className="btn btn-3 btn-sm btn-bad" onClick={() => setOpen(true)}><Icon name="trash" size={18} /> {texto}</button>;

  if (!guardado) {
    return (
      <>
        {trigger}
        <Confirm open={open} onClose={cerrar} title={`¿Descartar este ${nombre}?`} danger confirm="Descartar" busy={pending}
          text="Se borra el documento y no se guarda ninguna compra: no cambia ningún precio ni stock." onConfirm={confirmar} />
      </>
    );
  }

  const d = data;
  const articulos = d ? d.articulos.filter((a) => mueve(a.pmp[0], a.pmp[1]) || Math.abs(a.stock[1] - a.stock[0]) > 0.0005) : [];
  const negativos = d ? d.articulos.filter((a) => a.stock[1] < -0.0005 && a.stock[0] >= -0.0005) : [];
  const platos = d?.platos ?? [];
  const nada = d && !articulos.length && !platos.length && !d.avisos && !d.posteriores && !d.ventas.length;
  const falta = !!d?.ventas.length && !eleccion;
  const cab = d ? [d.doc.proveedor, d.doc.numero ? `n.º ${d.doc.numero}` : null, d.doc.fecha ? fecha(d.doc.fecha, { day: "numeric", month: "short", year: "numeric" }) : null, d.doc.total != null ? eur(d.doc.total) : null].filter(Boolean).join(" · ") : undefined;

  return (
    <>
      {trigger}
      <Sheet open={open} onClose={cerrar} title={`¿Borrar este ${nombre}?`} sub={cab} wide
        foot={<>
          <button type="button" className="btn btn-3" onClick={cerrar}>Cancelar</button>
          <button type="button" className="btn btn-danger" onClick={confirmar} disabled={!d || falta || pending}>{pending ? <span className="spin" /> : null}Borrar {nombre}</button>
        </>}>
        {error ? (
          <div className="note note-bad" role="alert"><Icon name="alert" /><div><p>{error}</p><button type="button" className="linkbtn" onClick={reintentar}>Volver a intentarlo</button></div></div>
        ) : !d ? (
          <div className="imp" aria-busy="true" aria-live="polite">
            <p className="muted small">Calculando qué cambia en tu stock, tus precios y tus platos…</p>
            <div className="imp-skel"><i className="skel" /><i className="skel" /><i className="skel" /></div>
          </div>
        ) : (
          <div className="imp">
            <p className="muted small">{nada ? "Este documento no mueve ningún precio ni stock: al borrarlo no cambia nada más." : "Borrarlo deshace lo que movió. Esto es lo que cambia, calculado ahora con tus datos:"}</p>

            {articulos.length ? (
              <section className="imp-sec" aria-labelledby="imp-art">
                <h3 id="imp-art">Stock y precio medio</h3>
                <ul className="imp-list">
                  {(todo ? articulos : articulos.slice(0, VISIBLES)).map((a) => (
                    <li key={a.id} className="imp-row">
                      <b>{a.name}</b>
                      {Math.abs(a.stock[1] - a.stock[0]) > 0.0005 ? <span className="imp-v">Stock <i>{qty(a.stock[0], 2)}</i> → <i>{qty(a.stock[1], 2)}</i> {a.unit}</span> : null}
                      {mueve(a.pmp[0], a.pmp[1]) ? <span className="imp-v imp-v-r">PMP <i>{eur(a.pmp[0])}</i> → {a.pmp[1] == null ? <i>sin precio</i> : <><i>{eur(a.pmp[1])}</i>/{a.unit}</>}</span> : null}
                    </li>
                  ))}
                </ul>
                {articulos.length > VISIBLES ? <button type="button" className="linkbtn" onClick={() => setTodo((x) => !x)}>{todo ? "Ver menos" : `Ver los ${articulos.length}`} <Icon name="chevD" size={16} className={`ic ${todo ? "flip" : ""}`} /></button> : null}
              </section>
            ) : null}

            {negativos.length ? (
              <div className="note note-warn"><Icon name="alert" /><p><b>{negativos.map((a) => a.name).join(", ")}</b> {negativos.length === 1 ? "quedaría" : "quedarían"} con stock negativo ({negativos.map((a) => `${qty(a.stock[1], 2)} ${a.unit}`).join(", ")}): se ha gastado o vendido más de lo que queda sin este albarán. Recuenta el almacén después.</p></div>
            ) : null}

            {platos.length ? (
              <section className="imp-sec" aria-labelledby="imp-pla">
                <h3 id="imp-pla">{plural(platos.length, "plato cambia", "platos cambian")} de coste</h3>
                <ul className="imp-list">
                  {platos.slice(0, VISIBLES).map((p) => (
                    <li key={p.id} className="imp-row imp-row-2">
                      <b>{p.name}</b>
                      <span className="imp-v"><i>{eur(p.antes)}</i> → <i>{eur(p.ahora)}</i> por ración{p.incompleto ? <> · <span className="warn-t">falta algún precio</span></> : null}</span>
                    </li>
                  ))}
                </ul>
                {platos.length > VISIBLES ? <p className="muted small">y {plural(platos.length - VISIBLES, "plato más", "platos más")}.</p> : null}
              </section>
            ) : null}

            {d.avisos || d.posteriores ? (
              <p className="small imp-aviso">
                <Icon name="bell" size={16} />
                <span>{d.avisos ? `${plural(d.avisos, "aviso de precio desaparece", "avisos de precio desaparecen")}` : null}{d.avisos && d.posteriores ? " y " : null}{d.posteriores ? `se rehace la comparación de precios de ${plural(d.posteriores, "albarán posterior", "albaranes posteriores")}` : null}.</span>
              </p>
            ) : null}

            {d.ventas.length ? (
              <section className="note note-warn imp-ventas" aria-labelledby="imp-ven">
                <Icon name="alert" />
                <div className="stack-sm">
                  <h3 id="imp-ven">Hay ventas que ya usaron estos precios</h3>
                  <p>Al importar estas ventas, el coste de cada plato se congeló con los precios de este albarán. Borrarlo no cambia esas cifras por sí solo.</p>
                  <ul className="imp-list">
                    {d.ventas.map((v) => (
                      <li key={v.id} className="imp-row imp-row-2">
                        <b>{v.filename || "Ventas importadas"} <small>{fecha(v.desde)} – {fecha(v.hasta)}</small></b>
                        <span className="imp-v">{qty(v.unidades, 0)} uds de {v.platos.length <= 2 ? v.platos.join(" y ") : `${v.platos.slice(0, 2).join(", ")} y ${v.platos.length - 2} más`} · coste congelado <i>{eur(v.coste)}</i>{Math.abs(v.efecto) >= 0.5 ? <> · sería <i>{eur(v.coste + v.efecto)}</i> (aprox.)</> : null}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="stack-xs" role="radiogroup" aria-label="Qué hacer con el coste de esas ventas">
                    <button type="button" role="radio" aria-checked={eleccion === "dejar"} className={`opt ${eleccion === "dejar" ? "is-on" : ""}`} onClick={() => setEleccion("dejar")}>
                      <span className="opt-r" /><span className="opt-t"><b>Dejarlo como está</b><small>Esas ventas conservan el coste con el que se calcularon.</small></span>
                    </button>
                    <button type="button" role="radio" aria-checked={eleccion === "recalcular"} className={`opt ${eleccion === "recalcular" ? "is-on" : ""}`} onClick={() => setEleccion("recalcular")}>
                      <span className="opt-r" /><span className="opt-t"><b>Recalcular su coste</b><small>Se vuelve a calcular con los precios de ahora, sin este albarán. Cambia el margen de esas ventas.</small></span>
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <p className="muted xs">No se puede deshacer. Queda anotado en el historial de tu cuenta.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}

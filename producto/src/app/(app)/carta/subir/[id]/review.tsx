"use client";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { TaskScreen } from "@/components/shell/task-screen";
import { NumInput } from "@/components/ui/num-input";
import { toastError } from "@/components/ui/toast";
import { FAMILIAS } from "@/lib/briefing";
import { bestMatches } from "@/lib/fuzzy";
import { eur } from "@/lib/format";
import type { OcrCarta } from "@/lib/ocr-types";
import { importarCarta, type CartaItem } from "../../actions";

export function CartaReview({ docId, carta, recetas, files }: { docId: string; carta: OcrCarta; recetas: { id: string; name: string; pvp: number | null }[]; files: { url: string; mime: string }[] }) {
  const initial = useMemo<(CartaItem & { conf: string; match: string | null })[]>(() => carta.platos.map((p) => {
    const m = bestMatches(p.nombre, recetas, (r) => [r.name], 0.8, 1)[0];
    return { nombre: p.nombre, familia: p.familia ?? "Otros", precio: p.precio, descripcion: p.descripcion ?? "", accion: m ? "actualizar" : "crear", recetaId: m?.item.id ?? null, conf: p.confianza, match: m?.item.name ?? null };
  }), [carta, recetas]);
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const upd = (i: number, patch: Partial<CartaItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const nC = items.filter((x) => x.accion === "crear").length, nA = items.filter((x) => x.accion === "actualizar").length;
  return (
    <TaskScreen title="Revisa la carta" sub={`${items.length} productos leídos`} back="/carta"
      foot={<div className="foot-in"><div className="foot-note">{nC ? `${nC} nuevos` : ""}{nC && nA ? " · " : ""}{nA ? `${nA} precios a actualizar` : ""}</div>
        <div className="foot-btns"><button type="button" className="btn" disabled={pending || !(nC + nA)} onClick={() => start(async () => { const r = await importarCarta(docId, items); if (r && !r.ok) toastError(r.error); })}>{pending ? <span className="spin" /> : null}Guardar en mi carta</button></div></div>}>
      <div className={files.length ? "val-grid" : "stack"}>
        {files.length ? <aside className="docpane"><div className="docpane-h"><b>Original</b></div><div className="docimg">{files.map((f, i) => f.mime === "application/pdf" ? <iframe key={i} src={f.url} title="Carta" /> : <img key={i} src={f.url} alt="Carta original" />)}</div></aside> : null}
        <div className="val-col">
          <div className="note"><Icon name="info" /><p>Revisa nombres, grupos y precios. Los que ya tienes se actualizan; los nuevos se crean sin ingredientes: luego añades su escandallo para saber lo que cuestan.</p></div>
          <div className="lns">{items.map((it, i) => (
            <article key={i} className={`ln ${it.conf === "baja" ? "is-dec" : ""}`}>
              <div className="ln-h"><span className={`conf conf-${it.conf}`}><span className="sr">Confianza {it.conf}</span></span>
                <div className="ln-n"><input className="inp inp-sm" value={it.nombre} onChange={(e) => upd(i, { nombre: e.target.value })} aria-label="Nombre" /></div></div>
              <div className="ln-edit">
                <div className="fld"><label>Grupo</label><input className="inp inp-sm" list="cr-fams" value={it.familia} onChange={(e) => upd(i, { familia: e.target.value })} /></div>
                <div className="fld"><label>Precio con IVA</label><NumInput className="inp inp-sm" decimals={2} value={it.precio} onValue={(n) => upd(i, { precio: n })} /></div>
                <div className="fld" style={{ gridColumn: "span 2" }}><label>Qué hacer</label>
                  <select className="inp inp-sm" value={it.accion === "actualizar" ? "a" : it.accion === "ignorar" ? "i" : "c"} onChange={(e) => upd(i, { accion: e.target.value === "a" ? "actualizar" : e.target.value === "i" ? "ignorar" : "crear" })}>
                    <option value="c">Crear producto nuevo</option>
                    {it.recetaId ? <option value="a">Actualizar el precio de «{it.match}»</option> : null}
                    <option value="i">No añadir</option>
                  </select></div>
              </div>
              {it.accion === "actualizar" && it.recetaId ? <p className="hint">Precio actual: {eur(recetas.find((r) => r.id === it.recetaId)?.pvp)} → {eur(it.precio)}</p> : null}
            </article>
          ))}</div>
          <datalist id="cr-fams">{FAMILIAS.map((f) => <option key={f} value={f} />)}</datalist>
        </div>
      </div>
    </TaskScreen>
  );
}

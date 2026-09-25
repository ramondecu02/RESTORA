"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { toastError } from "@/components/ui/toast";
import { FAMILIAS } from "@/lib/briefing";
import { PLANTILLAS } from "@/lib/plantillas";
import { eur } from "@/lib/format";
import { pvpDesdeMargen } from "@/lib/receta-edit";
import type { BaseUnit } from "@/lib/units";
import { crearReceta } from "../actions";

type Tipo = "plato" | "reventa" | "elaboracion" | "menu";
const OPTS: [Tipo, string, string][] = [
  ["plato", "Plato con escandallo", "Ingredientes y cantidades: el coste sale solo."],
  ["reventa", "Bebida o producto de reventa", "Lo vendes tal cual: precio de compra y margen."],
  ["elaboracion", "Elaboración", "Salsa, fondo o masa que usas en varios platos."],
  ["menu", "Menú", "Varios platos a un precio cerrado (menú del día)."],
];

export function NuevaReceta({ tipoInicial, plantilla, tpls, iva, canPrecios, nombre, familia, pvp: pvpIni }: {
  tipoInicial: Tipo; plantilla: string | null; tpls: { key: string; name: string; coste: number | null; faltan: number }[]; iva: number; canPrecios: boolean; nombre: string; familia: string; pvp: number | null;
}) {
  const router = useRouter();
  const tpl = plantilla ? PLANTILLAS.find((p) => p.key === plantilla) : null;
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [f, setF] = useState({ name: tpl?.name ?? nombre, familia: tpl?.familia ?? (familia || (tipoInicial === "reventa" ? "Vinos" : "Entrantes")), pvp: canPrecios ? tpl?.pvp ?? pvpIni : null, coste: 1 as number | null, margen: 75 as number | null, rinde: 1 as number | null, rindeUnit: "kg" as BaseUnit });
  const [usarTpl, setUsarTpl] = useState<string | null>(plantilla);
  const [pending, start] = useTransition();
  const auto = useRef(false);
  const create = () => start(async () => {
    const r = await crearReceta({ tipo: tipo === "reventa" ? "plato" : tipo, reventa: tipo === "reventa", name: f.name, familia: tipo === "elaboracion" ? "" : f.familia,
      pvp: tipo === "reventa" || !canPrecios ? null : f.pvp, coste: f.coste, margen: f.margen, rinde: f.rinde, rindeUnit: f.rindeUnit, plantilla: tipo === "plato" ? usarTpl : null });
    if (r.ok) router.replace(`/escandallos/${r.data!.id}`); else toastError(r.error);
  });
  useEffect(() => { if (plantilla && tpl && !auto.current) { auto.current = true; create(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (plantilla && tpl) return <div className="empty"><span className="spin" /><b>Preparando {tpl.name}…</b></div>;
  return (
    <div className="stack narrow-col">
      <div className="opts opts-2w" role="radiogroup" aria-label="Qué quieres crear">
        {OPTS.map(([k, t, s]) => <button key={k} type="button" role="radio" aria-checked={tipo === k} className={`opt ${tipo === k ? "is-on" : ""}`} onClick={() => { setTipo(k); if (k === "reventa" && FAMILIAS.indexOf(f.familia) < 7) setF({ ...f, familia: "Vinos" }); }}>
          <span className="opt-r" /><span className="opt-t"><b>{t}</b><small>{s}</small></span></button>)}
      </div>
      <div className="fld"><label htmlFor="nr-n">Nombre</label><input id="nr-n" className="inp" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tipo === "elaboracion" ? "Ej.: Salsa brava de la casa" : tipo === "reventa" ? "Ej.: Copa de vino tinto" : "Ej.: Tortilla de patatas"} /></div>
      {tipo !== "elaboracion" ? <div className="fld"><label htmlFor="nr-f">Grupo de la carta</label><input id="nr-f" className="inp" list="nr-fams" value={f.familia} onChange={(e) => setF({ ...f, familia: e.target.value })} /><datalist id="nr-fams">{FAMILIAS.map((x) => <option key={x} value={x} />)}</datalist></div> : null}
      {tipo === "plato" || tipo === "menu" ? <div className="fld"><label htmlFor="nr-p">Precio en carta, con IVA (opcional)</label><div className="inp-unit"><NumInput id="nr-p" decimals={2} value={f.pvp} disabled={!canPrecios} onValue={(n) => setF({ ...f, pvp: n })} /><span>€</span></div></div> : null}
      {tipo === "reventa" ? <div className="fgrid fgrid-2">
        <div className="fld"><label htmlFor="nr-c">Precio de compra (€ por unidad)</label><NumInput id="nr-c" decimals={4} value={f.coste} disabled={!canPrecios} onValue={(n) => setF({ ...f, coste: n == null ? null : Math.max(0, n) })} /></div>
        <div className="fld"><label htmlFor="nr-m">Margen deseado (%)</label><NumInput id="nr-m" decimals={1} value={f.margen} disabled={!canPrecios} onValue={(n) => setF({ ...f, margen: n == null ? null : Math.min(99, Math.max(0, n)) })} /></div>
        {!canPrecios ? <p className="hint">Tu rol no cambia precios de carta: el precio lo pondrá el propietario o el responsable de costes.</p>
          : f.coste != null && f.margen != null ? <p className="hint">PVP resultante: <b>{eur(pvpDesdeMargen(f.coste, f.margen, iva))}</b> con IVA del {iva} %.</p> : null}
      </div> : null}
      {tipo === "elaboracion" ? <div className="fld"><label htmlFor="nr-r">¿Cuánto sale de la receta?</label><div className="inp-unit"><NumInput id="nr-r" value={f.rinde} onValue={(n) => setF({ ...f, rinde: n })} />
        <select className="inp" style={{ width: 90 }} value={f.rindeUnit} onChange={(e) => setF({ ...f, rindeUnit: e.target.value as BaseUnit })} aria-label="Unidad"><option>kg</option><option>L</option><option>ud</option></select></div>
        <p className="hint">El coste se reparte por {f.rindeUnit}: así puedes usarla en gramos o mililitros en cada plato.</p></div> : null}
      {tipo === "plato" ? <section className="card">
        <div className="card-h"><h2 className="h3">Empezar desde una plantilla (opcional)</h2></div>
        <p className="muted small">Con ingredientes del catálogo y cantidades orientativas. Los que ya compras llevan tu precio.</p>
        <div className="pick-list">{tpls.map((t) => (
          <button key={t.key} type="button" className="pick" aria-pressed={usarTpl === t.key} onClick={() => { const p = PLANTILLAS.find((x) => x.key === t.key)!; setUsarTpl(usarTpl === t.key ? null : t.key); setF({ ...f, name: usarTpl === t.key ? f.name : p.name, familia: p.familia, pvp: canPrecios ? f.pvp ?? p.pvp : null }); }}>
            <span className="li-ic">{usarTpl === t.key ? <Icon name="check" /> : <Icon name="book" />}</span>
            <span><b>{t.name}</b><small>{t.coste != null ? `${eur(t.coste)} por ración con tus precios` : `faltan ${t.faltan} precios: se completan con tus albaranes`}</small></span>
          </button>))}</div>
      </section> : null}
      <button type="button" className="btn" disabled={pending || f.name.trim().length < 2} onClick={create}>{pending ? <span className="spin" /> : null}{tipo === "elaboracion" ? "Crear elaboración" : "Crear y añadir ingredientes"}</button>
    </div>
  );
}

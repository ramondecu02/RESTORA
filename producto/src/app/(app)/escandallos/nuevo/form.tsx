"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { NumInput } from "@/components/ui/num-input";
import { toastError } from "@/components/ui/toast";
import { FAMILIAS } from "@/lib/briefing";
import { PLANTILLAS } from "@/lib/plantillas";
import { pvpDesdeMargen } from "@/lib/receta-edit";
import type { BaseUnit, LineUnit } from "@/lib/units";
import { crearReceta, sugerirIngredientes } from "../actions";
import { eur, qty } from "@/lib/format";

type Tipo = "plato" | "reventa" | "elaboracion" | "menu";
type Sug = { raciones: number; pvp: number | null; lineas: { cat: string; q: number; u: LineUnit; name: string }[]; modelo: string };
const OPTS: [Tipo, string, string][] = [
  ["plato", "Plato con escandallo", "Ingredientes y cantidades: el coste sale solo."],
  ["reventa", "Bebida o producto de reventa", "Lo vendes tal cual: precio de compra y margen."],
  ["elaboracion", "Elaboración", "Salsa, fondo o masa que usas en varios platos."],
  ["menu", "Menú", "Varios platos a un precio cerrado (menú del día)."],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function NuevaReceta({ tipoInicial, plantilla, tpls, iva, canPrecios, iaOn, nombre, familia, pvp: pvpIni }: {
  tipoInicial: Tipo; plantilla: string | null; tpls: { key: string; name: string; coste: number | null; faltan: number; conPrecio: number }[]; iva: number; canPrecios: boolean; iaOn: boolean; nombre: string; familia: string; pvp: number | null;
}) {
  const router = useRouter();
  const tpl = plantilla ? PLANTILLAS.find((p) => p.key === plantilla) : null;
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [tplq, setTplq] = useState("");
  const [f, setF] = useState({ name: tpl?.name ?? nombre, familia: tpl?.familia ?? (familia || (tipoInicial === "reventa" ? "Vinos" : "Entrantes")), pvp: canPrecios ? tpl?.pvp ?? pvpIni : null, coste: 1 as number | null, margen: 75 as number | null, rinde: 1 as number | null, rindeUnit: "kg" as BaseUnit });
  const [usarTpl, setUsarTpl] = useState<string | null>(plantilla);
  const [pending, start] = useTransition();
  const [iaBusy, setIaBusy] = useState(false);
  const [sug, setSug] = useState<Sug | null>(null);
  const auto = useRef(false);
  const create = (lineasIa?: { cat: string; q: number; u: LineUnit }[], racionesIa?: number) => start(async () => {
    const r = await crearReceta({ tipo: tipo === "reventa" ? "plato" : tipo, reventa: tipo === "reventa", name: f.name, familia: tipo === "elaboracion" ? "" : f.familia,
      pvp: tipo === "reventa" || !canPrecios ? null : f.pvp, coste: f.coste, margen: f.margen, rinde: f.rinde, rindeUnit: f.rindeUnit,
      plantilla: tipo === "plato" && !lineasIa ? usarTpl : null, lineasIa: lineasIa ?? null, racionesIa: racionesIa ?? null });
    if (r.ok) router.replace(`/escandallos/${r.data!.id}`); else toastError(r.error);
  });
  const sugerir = () => { setIaBusy(true); setSug(null); (async () => {
    const r = await sugerirIngredientes({ name: f.name, familia: f.familia });
    if (r.ok) { setSug(r.data!); if (canPrecios && r.data!.pvp != null) setF((x) => ({ ...x, pvp: x.pvp ?? r.data!.pvp })); setUsarTpl(null); } else toastError(r.error);
    setIaBusy(false);
  })(); };
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
      {tipo === "plato" || tipo === "menu" ? <div className="fld"><label htmlFor="nr-p">Precio en carta, con IVA (opcional)</label><div className="inp-sfx"><NumInput id="nr-p" decimals={2} value={f.pvp} disabled={!canPrecios} onValue={(n) => setF({ ...f, pvp: n })} /><span>€</span></div></div> : null}
      {tipo === "reventa" ? <div className="fgrid fgrid-2">
        <div className="fld"><label htmlFor="nr-c">Precio de compra (€ por unidad)</label><NumInput id="nr-c" decimals={4} value={f.coste} disabled={!canPrecios} onValue={(n) => setF({ ...f, coste: n == null ? null : Math.max(0, n) })} /></div>
        <div className="fld"><label htmlFor="nr-m">Margen deseado (%)</label><NumInput id="nr-m" decimals={1} value={f.margen} disabled={!canPrecios} onValue={(n) => setF({ ...f, margen: n == null ? null : Math.min(99, Math.max(0, n)) })} /></div>
        {!canPrecios ? <p className="hint">Tu rol no cambia precios de carta: el precio lo pondrá el propietario o el responsable de costes.</p>
          : f.coste != null && f.margen != null ? <p className="hint">PVP resultante: <b>{eur(pvpDesdeMargen(f.coste, f.margen, iva))}</b> con IVA del {iva} %.</p> : null}
      </div> : null}
      {tipo === "elaboracion" ? <div className="fld"><label htmlFor="nr-r">¿Cuánto sale de la receta?</label><div className="inp-unit"><NumInput id="nr-r" value={f.rinde} onValue={(n) => setF({ ...f, rinde: n })} />
        <select className="inp" style={{ width: 90 }} value={f.rindeUnit} onChange={(e) => setF({ ...f, rindeUnit: e.target.value as BaseUnit })} aria-label="Unidad"><option>kg</option><option>L</option><option>ud</option></select></div>
        <p className="hint">El coste se reparte por {f.rindeUnit}: así puedes usarla en gramos o mililitros en cada plato.</p></div> : null}
      {tipo === "plato" && iaOn ? (
        <section className="card">
          <div className="card-h"><h2 className="h3">Sugerir ingredientes con IA</h2></div>
          <p className="muted small">Escribe el nombre del plato y la IA propone sus ingredientes y cantidades a partir de tu catálogo. Luego los ajustas en la ficha.</p>
          <button type="button" className="btn btn-2 btn-sm" disabled={iaBusy || f.name.trim().length < 2} onClick={sugerir}>{iaBusy ? <span className="spin" /> : <Icon name="spark" size={18} />} {f.name.trim() ? `Sugerir para «${f.name.trim()}»` : "Sugerir ingredientes"}</button>
          {sug ? (
            <div className="stack-sm" style={{ marginTop: 12 }}>
              <p className="small"><b>{sug.lineas.length} {sug.lineas.length === 1 ? "ingrediente" : "ingredientes"}</b> para {sug.raciones} {sug.raciones === 1 ? "ración" : "raciones"}{sug.pvp != null ? ` · PVP sugerido ${eur(sug.pvp)}` : ""}:</p>
              <div className="tags">{sug.lineas.map((l, i) => <span key={i} className="chip">{l.name} · {qty(l.q)} {l.u}</span>)}</div>
              <div className="row-wrap"><button type="button" className="btn btn-sm" disabled={pending} onClick={() => create(sug.lineas.map((l) => ({ cat: l.cat, q: l.q, u: l.u })), sug.raciones)}>{pending ? <span className="spin" /> : null}Crear con estos ingredientes</button><button type="button" className="btn btn-3 btn-sm" onClick={() => setSug(null)}>Descartar</button></div>
              <p className="muted small">Es una propuesta: revisa siempre las cantidades en la ficha.</p>
            </div>
          ) : null}
        </section>
      ) : null}
      {tipo === "plato" ? (() => {
        const q = norm(tplq.trim());
        // Primero las que más ingredientes tienes ya con precio (coste real desde el minuto uno)
        const ranked = [...tpls].sort((a, b) => b.conPrecio - a.conPrecio || a.name.localeCompare(b.name, "es"));
        const filtradas = q ? ranked.filter((t) => norm(t.name).includes(q)) : ranked;
        const visibles = filtradas.slice(0, 8);
        return (
          <section className="card">
            <div className="card-h card-h-nw"><h2 className="h3">Empezar desde una plantilla <span className="muted">(opcional)</span></h2><span className="tag">{tpls.length}</span></div>
            <p className="muted small">Con ingredientes del catálogo y cantidades orientativas. Los que ya compras llevan tu precio; el resto se completa con tus próximos albaranes.</p>
            <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" value={tplq} onChange={(e) => setTplq(e.target.value)} placeholder="Buscar plato (tortilla, paella, croquetas…)" aria-label="Buscar plantilla" /></div>
            {visibles.length ? <div className="pick-list">{visibles.map((t) => (
              <button key={t.key} type="button" className="pick" aria-pressed={usarTpl === t.key} onClick={() => { const p = PLANTILLAS.find((x) => x.key === t.key)!; setUsarTpl(usarTpl === t.key ? null : t.key); setF({ ...f, name: usarTpl === t.key ? f.name : p.name, familia: p.familia, pvp: canPrecios ? f.pvp ?? p.pvp : null }); }}>
                <span className="li-ic">{usarTpl === t.key ? <Icon name="check" /> : <Icon name="book" />}</span>
                <span><b>{t.name}</b><small>{t.coste != null ? `${eur(t.coste)} por ración con tus precios` : t.conPrecio > 0 ? `${t.conPrecio} ingredientes con tu precio · faltan ${t.faltan}` : `faltan ${t.faltan} precios: se completan con tus albaranes`}</small></span>
              </button>))}</div> : <p className="muted small">Ninguna plantilla coincide con «{tplq}». Créalo y añade los ingredientes a mano.</p>}
            {filtradas.length > visibles.length ? <p className="muted small">y {filtradas.length - visibles.length} más — escribe para afinar la búsqueda.</p> : null}
          </section>
        );
      })() : null}
      <button type="button" className="btn" disabled={pending || f.name.trim().length < 2} onClick={() => create()}>{pending ? <span className="spin" /> : null}{tipo === "elaboracion" ? "Crear elaboración" : "Crear y añadir ingredientes"}</button>
    </div>
  );
}

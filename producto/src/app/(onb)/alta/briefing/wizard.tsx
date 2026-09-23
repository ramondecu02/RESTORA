"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { OnbFoot, OnbShell } from "@/components/onb-shell";
import { toastError } from "@/components/ui/toast";
import { COMPRAS, OBJ, PLATOS, ROLES_BRIEF, ROLE_HINT, TIPOS, TPVS } from "@/lib/briefing";
import { guardarBriefing, type Brief } from "../../actions";

function Opt({ title, sub, on, onClick }: { title: string; sub?: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`opt ${on ? "is-on" : ""}`} role="radio" aria-checked={on} onClick={onClick}>
      <span className="opt-r" /><span className="opt-t"><b>{title}</b>{sub ? <small>{sub}</small> : null}</span>
    </button>
  );
}
function Pill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button type="button" className={`pill ${on ? "is-on" : ""}`} role="radio" aria-checked={on} onClick={onClick}>{label}</button>;
}

export function BriefingWizard({ restName, initial, editar }: { restName: string; initial: Record<string, string>; editar: boolean }) {
  const [step, setStep] = useState(1);
  const [b, setB] = useState<Brief>({ tipo: initial.tipo ?? "", platos: initial.platos ?? "", compras: initial.compras ?? "", tpv: initial.tpv ?? TPVS[0], rol: initial.rol ?? "", objetivo: initial.objetivo ?? "" });
  const [pending, start] = useTransition();
  const set = (k: keyof Brief, v: string) => setB((x) => ({ ...x, [k]: v }));
  const exitHref = editar ? "/hoy" : "/bienvenida";
  const backBtn = (to: number | null) => to == null
    ? <Link className="btn btn-3 btn-sm" href={exitHref}><Icon name="back" /> Atrás</Link>
    : <button type="button" className="btn btn-3 btn-sm" onClick={() => setStep(to)}><Icon name="back" /> Atrás</button>;
  const save = () => start(async () => { const r = await guardarBriefing(b, editar); if (r && !r.ok) toastError(r.error); });

  if (step === 1) {
    const ok = !!(b.tipo && b.platos);
    return (
      <OnbShell step="negocio" back={exitHref} prog={[1, 3]} foot={
        <OnbFoot back={backBtn(null)} note={ok ? undefined : "Elige una opción en cada pregunta."}>
          <button type="button" className="btn" disabled={!ok} onClick={() => setStep(2)}>Siguiente</button>
        </OnbFoot>}>
        <div className="onb-h"><h1>¿Qué tipo de negocio es {restName}?</h1><p>Con esto ajustamos ejemplos y plantillas. Puedes cambiarlo después.</p></div>
        <div className="q">
          <div className="opts opts-2" role="radiogroup" aria-label="Tipo de negocio">{TIPOS.map((t) => <Opt key={t} title={t} on={b.tipo === t} onClick={() => set("tipo", t)} />)}</div>
          {b.tipo === "Grupo con varios locales" ? <div className="note"><Icon name="info" /><p>La vista de grupo llegará más adelante. Ahora configuramos tu primer local: cada local lleva sus propios proveedores y precios.</p></div> : null}
        </div>
        <div className="q">
          <h2 className="h2" id="q-platos">¿Cuántos platos tiene tu carta?</h2>
          <div className="pills pills-4w" role="radiogroup" aria-labelledby="q-platos">{PLATOS.map((p) => <Pill key={p} label={p} on={b.platos === p} onClick={() => set("platos", p)} />)}</div>
        </div>
      </OnbShell>
    );
  }
  if (step === 2) {
    const ok = !!b.compras;
    return (
      <OnbShell step="negocio" back={() => setStep(1)} prog={[2, 3]} foot={
        <OnbFoot back={backBtn(1)} note={ok ? undefined : "Elige cómo llevas las compras."}>
          <button type="button" className="btn" disabled={!ok} onClick={() => setStep(3)}>Siguiente</button>
        </OnbFoot>}>
        <div className="onb-h"><h1>¿Cómo llevas hoy las compras?</h1><p>Para saber de dónde partimos.</p></div>
        <div className="q"><div className="opts opts-2w" role="radiogroup" aria-label="Cómo llevas las compras">{COMPRAS.map(([k, t, s]) => <Opt key={k} title={t} sub={s} on={b.compras === k} onClick={() => set("compras", k)} />)}</div></div>
        <div className="q">
          <div className="fld">
            <label htmlFor="b-tpv" className="h2">¿Qué TPV usas para cobrar?</label>
            <select className="inp" id="b-tpv" value={b.tpv} onChange={(e) => set("tpv", e.target.value)}>{TPVS.map((t) => <option key={t}>{t}</option>)}</select>
            <p className="hint">En esta versión las ventas se importan con el archivo CSV que exporta tu TPV. No hace falta conectarlo.</p>
          </div>
        </div>
      </OnbShell>
    );
  }
  const ok = !!(b.rol && b.objetivo);
  return (
    <OnbShell step="negocio" back={() => setStep(2)} prog={[3, 3]} foot={
      <OnbFoot back={backBtn(2)} note={ok ? undefined : "Elige tu rol y tu objetivo."}>
        <button type="button" className="btn" disabled={!ok || pending} onClick={save}>{pending ? <span className="spin" /> : null}{editar ? "Guardar cambios" : "Terminar"}</button>
      </OnbFoot>}>
      <div className="onb-h"><h1>¿Cuál es tu papel en {restName}?</h1><p>El rol ordena lo que ves primero. El objetivo decide qué te enseñamos cada día.</p></div>
      <div className="q">
        <div className="pills pills-4w" role="radiogroup" aria-label="Tu rol">{ROLES_BRIEF.map(([k, l]) => <Pill key={k} label={l} on={b.rol === k} onClick={() => set("rol", k)} />)}</div>
        {b.rol ? <p className="hint">{ROLE_HINT[b.rol]}</p> : null}
      </div>
      <div className="q">
        <h2 className="h2" id="q-obj">¿Qué quieres conseguir primero?</h2>
        <div className="opts opts-2w" role="radiogroup" aria-labelledby="q-obj">{OBJ.map(([k, t]) => <Opt key={k} title={t} on={b.objetivo === k} onClick={() => set("objetivo", k)} />)}</div>
      </div>
    </OnbShell>
  );
}

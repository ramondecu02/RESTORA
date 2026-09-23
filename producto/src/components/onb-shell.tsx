import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, Logo } from "./icons";

const ST: [string, string][] = [["cuenta", "Cuenta"], ["negocio", "Tu negocio"], ["local", "Tu local"], ["prov", "Proveedores"]];

export function OnbShell({ step, back, prog, children, foot }: {
  step: "negocio" | "local" | "prov"; back?: string | (() => void); prog?: [number, number]; children: ReactNode; foot: ReactNode;
}) {
  const idx = ST.findIndex((s) => s[0] === step);
  const backBtn = typeof back === "string"
    ? <Link className="iconbtn" href={back} aria-label="Atrás"><Icon name="back" size={22} /></Link>
    : back ? <button type="button" className="iconbtn" onClick={back} aria-label="Atrás"><Icon name="back" size={22} /></button>
    : <span className="onb-top-sp" />;
  return (
    <div className="scr onb">
      <header className="onb-top">
        {backBtn}
        <div className="onb-logo only-wide"><Logo /><span>RESTORA</span></div>
        <div className="onb-prog only-narrow">
          {prog ? <>
            <div className="bar" role="progressbar" aria-label="Progreso" aria-valuenow={prog[0]} aria-valuemin={0} aria-valuemax={prog[1]}><i style={{ width: `${Math.round((prog[0] / prog[1]) * 100)}%` }} /></div>
            <span>Paso {prog[0]} de {prog[1]}</span>
          </> : null}
        </div>
        <ol className="stepper only-wide" aria-label="Pasos del alta">
          {ST.map((s, i) => (
            <li key={s[0]} className={i < idx ? "done" : i === idx ? "on" : ""} aria-current={i === idx ? "step" : undefined}>
              <span className="st-n">{i < idx ? <Icon name="check" size={14} sw={3} /> : i + 1}</span><span>{s[1]}</span>
            </li>
          ))}
        </ol>
        <div className="only-wide" />
      </header>
      <div className="onb-main"><div className="onb-card">{children}</div></div>
      <footer className="foot onb-foot">{foot}</footer>
    </div>
  );
}

export function OnbFoot({ back, note, children }: { back?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="foot-in">
      {note ? <div className="foot-note only-narrow"><Icon name="info" /><span>{note}</span></div> : null}
      {back || note ? <div className="foot-note only-wide">{back}{note ? <span>{note}</span> : null}</div> : null}
      <div className="foot-btns">{children}</div>
    </div>
  );
}

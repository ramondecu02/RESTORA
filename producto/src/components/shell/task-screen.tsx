// Pantalla de tarea (sin pestañas): cabecera con volver, contenido y pie con acciones. Válida en cliente y servidor.
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../icons";

export function TaskScreen({ title, sub, back, actions, foot, children }: { title: ReactNode; sub?: ReactNode; back?: string; actions?: ReactNode; foot?: ReactNode; children: ReactNode }) {
  return (
    <>
      <span data-task hidden />
      <header className={`top task ${back ? "has-back" : ""}`}>
        {back ? <Link className="iconbtn" href={back} aria-label="Volver"><Icon name="back" size={22} /></Link> : null}
        <div className="top-title"><h1>{title}</h1>{sub ? <p className="top-sub">{sub}</p> : null}</div>
        {actions ? <div className="top-actions">{actions}</div> : null}
      </header>
      <div className="content" id="content"><div className="wrap">{children}</div></div>
      {foot ? <footer className="foot">{foot}</footer> : null}
    </>
  );
}

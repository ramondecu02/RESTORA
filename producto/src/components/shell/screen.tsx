// Pantalla estándar de la app: cabecera (título, volver, acciones), contenido desplazable y pie opcional.
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "../icons";
import { getAppCtx } from "@/server/ctx";
import { initials } from "@/lib/format";
import { AddButton } from "./add";
import { TopSearch } from "./search";

export async function Screen({ title, sub, back, actions, task, fab, foot, children, wide }: {
  title: ReactNode; sub?: ReactNode; back?: string; actions?: ReactNode; task?: boolean; fab?: boolean; foot?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const ctx = await getAppCtx();
  return (
    <>
      {task || foot ? <span data-task hidden /> : null}
      {fab ? <span data-fab hidden /> : null}
      <header className={`top ${back ? "has-back" : ""} ${task ? "task" : ""}`}>
        {back ? <Link className="iconbtn" href={back} aria-label="Volver"><Icon name="back" size={22} /></Link> : null}
        <div className="top-title"><h1>{title}</h1>{sub ? <p className="top-sub">{sub}</p> : null}</div>
        <div className="top-actions">
          {actions}
          {!task ? <TopSearch /> : null}
          {!task ? <AddButton /> : null}
          {ctx ? <Link className={`avatar ${back || task ? "only-wide" : ""}`} href="/cuenta" aria-label="Tu cuenta">{initials(ctx.name)}</Link> : null}
        </div>
      </header>
      <div className="content" id="content"><div className={`wrap ${wide ? "wrap-wide" : ""}`}>{children}</div></div>
      {foot ? <footer className="foot">{foot}</footer> : null}
    </>
  );
}

export function Foot({ note, tone, children }: { note?: ReactNode; tone?: "warn" | "ok"; children: ReactNode }) {
  return (
    <div className="foot-in">
      {note ? <div className={`foot-note ${tone ?? ""}`}>{note}</div> : null}
      <div className="foot-btns">{children}</div>
    </div>
  );
}

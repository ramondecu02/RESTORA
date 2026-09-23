"use client";
// Pantalla de lectura: pasos animados y consulta del estado hasta que el borrador está listo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { TaskScreen } from "@/components/shell/task-screen";

const STEPS = ["Documento recibido", "Leyendo proveedor, fecha y líneas", "Contrastando el IVA con el desglose", "Emparejando con tus artículos", "Comprobando que los totales cuadran"];

export function Leyendo({ id, name, pages, thumb, kind }: { id: string; name: string; pages: number; thumb: string | null; kind: string }) {
  const router = useRouter();
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(t0);
  useEffect(() => {
    let alive = true;
    const tick = setInterval(() => setNow(Date.now()), 400);
    const poll = async () => {
      while (alive) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const r = await fetch(`/api/documentos/${id}/estado`, { cache: "no-store" });
          if (r.status === 401) { router.refresh(); return; }
          const j = await r.json();
          if (j.status && j.status !== "leyendo" && j.status !== "subido") { router.refresh(); return; }
        } catch { /* sin conexión: seguimos intentando */ }
      }
    };
    poll();
    return () => { alive = false; clearInterval(tick); };
  }, [id, router]);
  const secs = (now - t0) / 1000;
  const k = Math.min(0.95, secs / 25);
  const cur = Math.min(STEPS.length - 1, 1 + Math.floor(secs / 4));
  return (
    <TaskScreen title={kind === "carta" ? "Leyendo la carta" : "Leyendo el albarán"} back="/compras"
      foot={<div className="foot-in"><div className="foot-btns"><Link className="btn btn-3" href="/hoy">Seguir en segundo plano</Link><button type="button" className="btn" disabled><span className="spin" /> Leyendo…</button></div></div>}>
      <div className="proc">
        <div className="proc-doc">
          <div className="proc-thumb" aria-hidden="true">{thumb ? <img src={thumb} alt="" /> : Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
          <div><b>{name}</b><small>{pages === 1 ? "1 página" : `${pages} páginas`}</small></div>
        </div>
        <div className="bar bar-lg" aria-hidden="true"><i style={{ width: `${Math.round(k * 100)}%` }} /></div>
        <ol className="steps" aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s} className={`step ${i < cur ? "done" : i === cur ? "now" : ""}`}>
              <span className="sd">{i < cur ? <Icon name="check" size={14} sw={3} /> : null}</span><span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="muted">Suele tardar entre 10 y 30 segundos. Puedes seguir con otra cosa: te avisamos en Hoy cuando esté listo para revisar.</p>
      </div>
    </TaskScreen>
  );
}

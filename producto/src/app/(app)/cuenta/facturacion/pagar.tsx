"use client";
// Elegir plan y periodo (mensual o anual) y pasar a pagar; quien ya tiene suscripción cambia de plan o cancela en el portal de pagos.
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { toastError } from "@/components/ui/toast";
import { eur, num } from "@/lib/format";
import { ahorroAnual, PLANES, precioDe, TIERS, type Intervalo, type Tier } from "@/lib/planes";
import { irAPagar, irAPortal } from "../actions";

export function Pagar({ activo, tieneCliente, disponibles, actual, intervaloActual }: {
  activo: boolean; tieneCliente: boolean; disponibles: { tier: Tier; intervalo: Intervalo }[]; actual: Tier | null; intervaloActual: Intervalo | null;
}) {
  const [pending, start] = useTransition();
  const [intervalo, setIntervalo] = useState<Intervalo>(intervaloActual ?? (disponibles.some((d) => d.intervalo === "year") ? "year" : "month"));
  const hayAnual = disponibles.some((d) => d.intervalo === "year"), hayMensual = disponibles.some((d) => d.intervalo === "month");
  const puede = (t: Tier) => disponibles.some((d) => d.tier === t && d.intervalo === intervalo);
  const portal = () => start(async () => { const r = await irAPortal(); if (r && !r.ok) toastError(r.error); });
  return (
    <div className="stack">
      {!activo ? (
        <>
          {hayAnual && hayMensual ? (
            <div className="seg" role="tablist" aria-label="Periodo de pago" style={{ maxWidth: 320 }}>
              <button type="button" role="tab" aria-selected={intervalo === "month"} className={intervalo === "month" ? "is-on" : ""} onClick={() => setIntervalo("month")}>Mensual</button>
              <button type="button" role="tab" aria-selected={intervalo === "year"} className={intervalo === "year" ? "is-on" : ""} onClick={() => setIntervalo("year")}>Anual</button>
            </div>
          ) : null}
          <div className="plan-grid">
            {TIERS.map((t) => {
              const p = PLANES[t], ah = ahorroAnual(t);
              return (
                <div key={t} className={`plan-card ${actual === t ? "is-on" : ""}`}>
                  <div className="plan-h"><b>{p.nombre}</b><span className="muted small">{p.resumen}</span></div>
                  <div className="plan-price"><b>{eur(precioDe(t, intervalo))}</b><span className="muted small"> {intervalo === "year" ? "/año" : "/mes"} + IVA</span></div>
                  {intervalo === "year" ? <p className="muted small plan-save">Ahorras {eur(ah.ahorro)} al año ({num(ah.meses, 1)} meses gratis)</p> : <p className="muted small plan-save">&nbsp;</p>}
                  <ul className="plan-li small">
                    <li><Icon name="check" size={16} /> {p.locales === 1 ? "1 local" : `Hasta ${p.locales} locales`}{p.locales > 1 ? " (próximamente)" : ""}</li>
                    <li><Icon name="check" size={16} /> {num(p.albaranes, 0)} lecturas de albaranes al mes</li>
                  </ul>
                  <button type="button" className="btn btn-sm btn-block" disabled={pending || !puede(t)} onClick={() => start(async () => { const r = await irAPagar(t, intervalo); if (r && !r.ok) toastError(r.error); })}>
                    {pending ? <span className="spin" /> : null}{puede(t) ? `Elegir ${p.nombre}` : "No disponible"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="muted small">Los precios no incluyen IVA: se añade aparte al pagar. Sin permanencia: puedes cancelar cuando quieras.</p>
        </>
      ) : <p className="muted small">Para cambiar de plan o de periodo, o cancelar, entra en «Gestionar pagos y facturas».</p>}
      {tieneCliente ? <div className="row-wrap"><button type="button" className="btn btn-2 btn-sm" disabled={pending} onClick={portal}>Gestionar pagos y facturas</button></div> : null}
    </div>
  );
}

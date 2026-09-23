"use client";
import { useTransition } from "react";
import { toastError } from "@/components/ui/toast";
import { irAPagar, irAPortal } from "../actions";

export function Pagar({ activo, tieneCliente }: { activo: boolean; tieneCliente: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="row-wrap">
      {!activo ? <button type="button" className="btn btn-sm" disabled={pending} onClick={() => start(async () => { const r = await irAPagar(); if (r && !r.ok) toastError(r.error); })}>{pending ? <span className="spin" /> : null}Suscribirme</button> : null}
      {tieneCliente ? <button type="button" className="btn btn-2 btn-sm" disabled={pending} onClick={() => start(async () => { const r = await irAPortal(); if (r && !r.ok) toastError(r.error); })}>Gestionar pagos y facturas</button> : null}
    </div>
  );
}

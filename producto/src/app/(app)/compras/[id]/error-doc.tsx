"use client";
import { useTransition } from "react";
import { Icon } from "@/components/icons";
import { TaskScreen } from "@/components/shell/task-screen";
import { toastError } from "@/components/ui/toast";
import { aMano, descartar, reintentar } from "../actions";

export function ErrorDoc({ id, error, canRetry, carta }: { id: string; error: string | null; canRetry: boolean; carta?: boolean }) {
  const [pending, start] = useTransition();
  const go = (f: () => Promise<{ ok: boolean; error?: string } | undefined | void>) => start(async () => { const r = await f(); if (r && !r.ok && r.error) toastError(r.error); });
  return (
    <TaskScreen title="No hemos podido leerlo" back={carta ? "/carta" : "/compras"}>
      <div className="card"><div className="empty">
        <span className="li-ic bad"><Icon name="alert" /></span>
        <b>{error || "La lectura ha fallado."}</b>
        <p>Suele pasar con fotos movidas, con poca luz o cortadas. Puedes volver a intentarlo, meter las líneas a mano o descartarlo y hacer otra foto.</p>
        <div className="empty-actions">
          {canRetry ? <button type="button" className="btn" disabled={pending} onClick={() => go(() => reintentar(id))}><Icon name="refresh" size={18} /> Volver a leer</button> : null}
          {!carta ? <button type="button" className="btn btn-2" disabled={pending} onClick={() => go(() => aMano(id))}><Icon name="edit" size={18} /> Meterlo a mano</button> : null}
          <button type="button" className="btn btn-3" disabled={pending} onClick={() => go(() => descartar(id, carta ? "/carta" : "/compras"))}>Descartar</button>
        </div>
      </div></div>
    </TaskScreen>
  );
}

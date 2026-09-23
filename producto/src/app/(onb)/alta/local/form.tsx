"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon } from "@/components/icons";
import { OnbFoot, OnbShell } from "@/components/onb-shell";
import { TextField } from "@/components/ui/fields";
import { Submit } from "@/components/ui/submit";
import { guardarLocal } from "../../actions";

type L = { name: string; address: string; postal_code: string; ciudad: string; iva_venta: number; fc_objetivo: number; comensales_dia: number | null };

export function LocalForm({ initial }: { initial: L }) {
  const [s, act] = useActionState(guardarLocal, undefined);
  const [iva, setIva] = useState(initial.iva_venta);
  return (
    <form action={act} noValidate style={{ display: "contents" }}>
      <OnbShell step="local" back="/alta/briefing" foot={
        <OnbFoot back={<Link className="btn btn-3 btn-sm" href="/alta/briefing"><Icon name="back" /> Atrás</Link>}>
          <Submit className="btn" pendingText="Guardando…">Guardar y seguir</Submit>
        </OnbFoot>}>
        <div className="onb-h"><h1>Tu local</h1><p>Lo usamos en tus documentos y para calcular tus precios de venta con IVA. Todo se puede cambiar después.</p></div>
        {s?.error ? <div className="formerr"><Icon name="alert" /><p>{s.error}</p></div> : null}
        <div className="fgrid fgrid-2">
          <TextField label="Nombre del local" name="name" defaultValue={initial.name} autoComplete="organization" />
          <TextField label="Dirección" name="address" defaultValue={initial.address} autoComplete="street-address" placeholder="Calle y número" />
          <TextField label="Código postal" name="postal_code" defaultValue={initial.postal_code} autoComplete="postal-code" inputMode="numeric" hint="Sirve para comparar precios con cocinas de tu zona, siempre de forma anónima." />
          <TextField label="Ciudad" name="ciudad" defaultValue={initial.ciudad} autoComplete="address-level2" />
        </div>
        <div className="q">
          <h2 className="h2" id="q-iva">IVA de venta en carta</h2>
          <input type="hidden" name="iva_venta" value={iva} />
          <div className="pills" role="radiogroup" aria-labelledby="q-iva">
            {[10, 21].map((v) => <button key={v} type="button" className={`pill ${iva === v ? "is-on" : ""}`} role="radio" aria-checked={iva === v} onClick={() => setIva(v)}>{v} %</button>)}
          </div>
          <p className="hint">En hostelería suele ser el 10 %. El IVA de cada compra lo leemos del albarán: no hace falta que lo escribas.</p>
        </div>
        <div className="fgrid fgrid-2">
          <TextField label="Food cost objetivo (%)" name="fc_objetivo" inputMode="decimal" defaultValue={String(initial.fc_objetivo).replace(".", ",")} error={s?.fields?.fc_objetivo} hint="El coste de la materia prima sobre el precio de venta sin IVA. Lo habitual está entre el 28 y el 32 %." />
          <TextField label="Comensales al día (opcional)" name="comensales_dia" inputMode="numeric" defaultValue={initial.comensales_dia ?? ""} hint="Para calcular el ticket medio por comensal." />
        </div>
        <div className="fld"><label htmlFor="l-mon">Moneda</label><select className="inp" id="l-mon" disabled><option>Euro (EUR)</option></select><p className="hint">Otras monedas, más adelante.</p></div>
      </OnbShell>
    </form>
  );
}

"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { empezarManual } from "../actions";

export function NuevaManual({ provs }: { provs: { id: string; name: string }[] }) {
  const [prov, setProv] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="stack narrow-col">
      <div className="note"><Icon name="info" /><p>Para compras sin documento (el mercado, un ticket perdido) o cuando la foto no se lee. Añadirás cada producto con su cantidad y su precio sin IVA.</p></div>
      <div className="fld">
        <label htmlFor="m-prov">¿A quién le has comprado?</label>
        <select id="m-prov" className="inp" value={prov} onChange={(e) => setProv(e.target.value)}>
          <option value="">Lo escribo en el siguiente paso</option>
          {provs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <button type="button" className="btn" disabled={pending} onClick={() => start(() => empezarManual(prov || null))}>{pending ? <span className="spin" /> : null}Empezar</button>
    </div>
  );
}

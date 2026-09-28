"use client";
// Componer un pedido para un proveedor: elige el proveedor y ajusta cantidades (sugeridas para cubrir dos semanas).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { TaskScreen } from "@/components/shell/task-screen";
import { NumInput } from "@/components/ui/num-input";
import { toast, toastError } from "@/components/ui/toast";
import { eur, qty as fq } from "@/lib/format";
import { cantidadPedido } from "@/lib/inventory";
import type { BaseUnit } from "@/lib/units";
import { crearPedidoProveedor } from "../../actions";

type Art = { id: string; name: string; unit: BaseUnit; stock: number; minimo: number | null; consumo: number | null; precio: number | null; proveedorId: string | null };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sugerido = (a: Art) => cantidadPedido(a.stock, a.minimo, a.consumo);

export function NuevoPedido({ provs, arts, provInicial }: { provs: { id: string; name: string }[]; arts: Art[]; provInicial: string | null }) {
  const router = useRouter();
  const [prov, setProv] = useState(provInicial && provs.some((p) => p.id === provInicial) ? provInicial : "");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  // Al elegir proveedor, prerrellena lo que sugiere el inventario de sus artículos (sin pisar lo que ya pusiste a mano).
  const elegirProv = (id: string) => {
    setProv(id);
    setQty((prev) => {
      const next = { ...prev };
      for (const a of arts) if ((a.proveedorId ?? "") === id && !(a.id in next)) { const s = sugerido(a); if (s > 0) next[a.id] = s; }
      return next;
    });
  };
  const set1 = (id: string, n: number | null) => setQty((x) => { const next = { ...x }; if (n == null || n <= 0) delete next[id]; else next[id] = Math.round(n * 1000) / 1000; return next; });

  const enPedido = arts.filter((a) => (qty[a.id] ?? 0) > 0);
  const nq = norm(q.trim());
  const resto = arts.filter((a) => !(qty[a.id] > 0) && (nq ? norm(a.name).includes(nq) : (a.proveedorId ?? "") === prov)).slice(0, 40);
  const total = enPedido.reduce((s, a) => s + (qty[a.id] ?? 0) * (a.precio ?? 0), 0);
  const provName = provs.find((p) => p.id === prov)?.name;

  const crear = () => start(async () => {
    const r = await crearPedidoProveedor(prov || null, enPedido.map((a) => ({ articuloId: a.id, cantidad: qty[a.id] })));
    if (r.ok) { toast("Pedido creado"); router.replace("/inventario/pedidos"); router.refresh(); } else toastError(r.error);
  });

  const fila = (a: Art) => (
    <div className="ped-row" key={a.id}>
      <div className="ped-row-n">
        <b>{a.name}</b>
        <small>{a.minimo != null ? `Stock ${fq(a.stock)} / mín ${fq(a.minimo)}` : `Stock ${fq(a.stock)}`}{a.precio != null ? ` · ${eur(a.precio)}/${a.unit}` : ""}{!(qty[a.id] > 0) && sugerido(a) > 0 ? ` · sugerido ${fq(sugerido(a))}` : ""}</small>
      </div>
      <div className="inp-unit ped-row-q"><NumInput value={qty[a.id] ?? null} onValue={(n) => set1(a.id, n)} aria-label={`Cantidad de ${a.name}`} /><span>{a.unit}</span></div>
    </div>
  );

  const foot = (
    <div className="foot-in">
      <div className={`foot-note ${enPedido.length ? "ok" : ""}`}><Icon name="cart" />
        <span>{enPedido.length ? `${enPedido.length} ${enPedido.length === 1 ? "artículo" : "artículos"} · ${eur(total)} estimado` : "Añade artículos al pedido"}</span></div>
      <div className="foot-btns"><button type="button" className="btn" disabled={pending || !enPedido.length} onClick={crear}>{pending ? <span className="spin" /> : null}Crear pedido</button></div>
    </div>
  );

  return (
    <TaskScreen title="Nuevo pedido" sub="Elige el proveedor y las cantidades. Lo envías tú por WhatsApp, email o impreso." back="/inventario/pedidos" foot={foot}>
      <div className="stack">
        <div className="fld"><label htmlFor="np-prov">Proveedor</label>
          <select id="np-prov" className="inp" value={prov} onChange={(e) => elegirProv(e.target.value)}>
            <option value="">Sin proveedor asignado</option>
            {provs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {prov ? <p className="hint">Te propongo sus artículos bajo mínimo. Ajusta cantidades o busca cualquier otro para añadirlo.</p>
            : <p className="hint">Elige un proveedor para ver sus artículos, o busca cualquiera y añádelo al pedido.</p>}
        </div>

        {enPedido.length ? (
          <section className="card">
            <div className="card-h"><h2 className="h3">En el pedido</h2><span className="tag">{enPedido.length}</span></div>
            <div className="ped-list">{enPedido.map(fila)}</div>
          </section>
        ) : null}

        <section className="card">
          <div className="card-h"><h2 className="h3">Añadir artículos</h2></div>
          <div className="searchbox"><Icon name="search" size={18} /><input className="inp" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar artículo…" aria-label="Buscar artículo" /></div>
          {resto.length ? <div className="ped-list">{resto.map(fila)}</div>
            : <p className="muted small">{nq ? `Ningún artículo coincide con «${q}».` : prov ? `${provName} no tiene artículos asignados todavía. Búscalos por nombre para añadirlos.` : "Busca un artículo por su nombre para añadirlo."}</p>}
        </section>
      </div>
    </TaskScreen>
  );
}

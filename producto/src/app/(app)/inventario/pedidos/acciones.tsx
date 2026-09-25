"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Sheet } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { estadoPedido, pedidoAFactura, recibirPedido } from "../actions";

export function PedidoAcciones({ id, estado, phone, email, texto, local, albaran }: { id: string; estado: string; phone: string | null; email: string | null; texto: string; local: string; albaran: boolean }) {
  const [pending, start] = useTransition();
  const [recibir, setRecibir] = useState(false);
  const estadoA = (e: "enviado" | "cancelado", ok?: string) => start(async () => { const r = await estadoPedido(id, e); if (!r.ok) toastError(r.error); else if (ok) toast(ok); });
  const rec = (sumarStock: boolean) => start(async () => { const r = await recibirPedido(id, sumarStock); if (r.ok) { toast(r.msg ?? "Recibido"); setRecibir(false); } else toastError(r.error); });
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?!34)(\d{9})$/, "34$1")}?text=${encodeURIComponent(texto)}` : null;
  return (
    <div className="row-wrap">
      {wa ? <a className="btn btn-2 btn-xs" href={wa} target="_blank" rel="noopener" onClick={() => estado === "borrador" && estadoA("enviado")}><Icon name="whatsapp" size={16} /> WhatsApp</a> : null}
      {email ? <a className="btn btn-2 btn-xs" href={`mailto:${email}?subject=${encodeURIComponent("Pedido " + local)}&body=${encodeURIComponent(texto)}`} onClick={() => estado === "borrador" && estadoA("enviado")}><Icon name="mail" size={16} /> Email</a> : null}
      <button type="button" className="btn btn-2 btn-xs" onClick={() => navigator.clipboard?.writeText(texto).then(() => toast("Pedido copiado"))}><Icon name="copy" size={16} /> Copiar</button>
      {estado === "borrador" ? <button type="button" className="btn btn-3 btn-xs" disabled={pending} onClick={() => estadoA("enviado", "Marcado como enviado")}>Marcar enviado</button> : null}
      <button type="button" className="btn btn-xs" disabled={pending} onClick={() => setRecibir(true)}>Recibir</button>
      <button type="button" className="btn btn-2 btn-xs" disabled={pending} onClick={() => start(async () => { const r = await pedidoAFactura(id); if (r && !r.ok) toastError(r.error); })}>Registrar como factura</button>
      <button type="button" className="btn btn-3 btn-xs" disabled={pending} onClick={() => estadoA("cancelado")}>Cancelar</button>
      <Sheet open={recibir} onClose={() => setRecibir(false)} title="Recibir pedido" sub="¿Llega con albarán?"
        foot={<><button type="button" className="btn btn-3" onClick={() => setRecibir(false)}>Volver</button>
          <button type="button" className="btn btn-2" disabled={pending} onClick={() => rec(false)}>Con albarán: solo cerrar</button>
          <button type="button" className="btn" disabled={pending} onClick={() => rec(true)}>Sin albarán: sumar stock</button></>}>
        <p className="muted">Si escaneas o ya has guardado el albarán de esta entrega, el stock lo suma el albarán: cierra el pedido sin sumar nada para no contarlo dos veces. Si llega sin albarán, suma ahora las cantidades del pedido (sin tocar precios).</p>
        {albaran ? <div className="note note-warn"><Icon name="alert" /><p>Ya guardaste un albarán de este proveedor después de preparar el pedido. Si es esta entrega, su stock ya está sumado.</p></div> : null}
      </Sheet>
    </div>
  );
}

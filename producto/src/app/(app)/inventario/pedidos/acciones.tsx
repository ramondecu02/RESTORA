"use client";
import { useTransition } from "react";
import { Icon } from "@/components/icons";
import { toast, toastError } from "@/components/ui/toast";
import { estadoPedido, pedidoAFactura, recibirPedido } from "../actions";

export function PedidoAcciones({ id, estado, phone, email, texto, local }: { id: string; estado: string; phone: string | null; email: string | null; texto: string; local: string }) {
  const [pending, start] = useTransition();
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?!34)(\d{9})$/, "34$1")}?text=${encodeURIComponent(texto)}` : null;
  return (
    <div className="row-wrap">
      {wa ? <a className="btn btn-2 btn-xs" href={wa} target="_blank" rel="noopener" onClick={() => estado === "borrador" && start(async () => { await estadoPedido(id, "enviado"); })}><Icon name="whatsapp" size={16} /> WhatsApp</a> : null}
      {email ? <a className="btn btn-2 btn-xs" href={`mailto:${email}?subject=${encodeURIComponent("Pedido " + local)}&body=${encodeURIComponent(texto)}`} onClick={() => estado === "borrador" && start(async () => { await estadoPedido(id, "enviado"); })}><Icon name="mail" size={16} /> Email</a> : null}
      <button type="button" className="btn btn-2 btn-xs" onClick={() => navigator.clipboard?.writeText(texto).then(() => toast("Pedido copiado"))}><Icon name="copy" size={16} /> Copiar</button>
      {estado === "borrador" ? <button type="button" className="btn btn-3 btn-xs" disabled={pending} onClick={() => start(async () => { await estadoPedido(id, "enviado"); toast("Marcado como enviado"); })}>Marcar enviado</button> : null}
      <button type="button" className="btn btn-xs" disabled={pending} onClick={() => start(async () => { const r = await recibirPedido(id); if (r.ok) toast(r.msg ?? "Recibido"); else toastError(r.error); })}>Recibir</button>
      <button type="button" className="btn btn-2 btn-xs" disabled={pending} onClick={() => start(async () => { await pedidoAFactura(id); })}>Registrar como factura</button>
      <button type="button" className="btn btn-3 btn-xs" disabled={pending} onClick={() => start(async () => { await estadoPedido(id, "cancelado"); })}>Cancelar</button>
    </div>
  );
}

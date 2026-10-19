"use client";
// Botón "Añadir" (arriba en escritorio, flotante en móvil) y la hoja con las opciones.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../icons";
import { Sheet } from "../ui/sheet";

const open = () => window.dispatchEvent(new CustomEvent("rs:add"));

export function AddButton() {
  return <button type="button" className="btn btn-sm only-wide" onClick={open} data-tour="add-top"><Icon name="plus" size={18} /> Añadir</button>;
}
export function Fab() {
  // Al bajar por una lista se aparta para no tapar precios y cifras; al subir (o al llegar arriba) vuelve.
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    const c = document.getElementById("content");
    if (!c) return;
    let y = c.scrollTop;
    const f = () => {
      const n = c.scrollTop;
      if (Math.abs(n - y) < 8) return;
      setOculto(n > y && n > 120);
      y = n;
    };
    c.addEventListener("scroll", f, { passive: true });
    return () => c.removeEventListener("scroll", f);
  }, []);
  return <button type="button" className={`fab only-narrow ${oculto ? "fab-off" : ""}`} onClick={open} aria-label="Añadir" data-tour="add-fab"><Icon name="plus" size={24} /></button>;
}

type Opt = { href: string; icon: IconName; title: string; sub: string; rec?: boolean };
export function AddSheet({ canVentas }: { canVentas: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const f = () => setOn(true); window.addEventListener("rs:add", f); return () => window.removeEventListener("rs:add", f); }, []);
  const opts: Opt[] = [
    { href: "/compras/subir", icon: "camera", title: "Subir albarán o factura", sub: "Foto o PDF. Lo leemos y tú confirmas.", rec: true },
    { href: "/compras/nueva", icon: "edit", title: "Apuntar una compra a mano", sub: "Sin documento, línea a línea." },
    { href: "/escandallos/nuevo", icon: "book", title: "Nuevo plato o bebida", sub: "Plato con escandallo o producto de reventa." },
    { href: "/escandallos/nuevo?tipo=elaboracion", icon: "layers", title: "Nueva elaboración", sub: "Salsas, fondos, masas… para usar en platos." },
    { href: "/carta/subir", icon: "image", title: "Subir la carta", sub: "Foto o PDF. Creamos los platos con su precio." },
    { href: "/articulos/nuevo", icon: "box", title: "Nuevo artículo", sub: "Un ingrediente que aún no has comprado con albarán." },
    ...(canVentas ? [{ href: "/ventas/importar", icon: "chart" as IconName, title: "Importar ventas", sub: "El CSV que exporta tu TPV." }] : []),
  ];
  return (
    <Sheet open={on} onClose={() => setOn(false)} title="Añadir" sub="¿Qué quieres hacer?">
      <div className="stack-sm">
        {opts.map((o) => (
          <Link key={o.href} href={o.href} className={`addopt ${o.rec ? "rec" : ""}`} onClick={() => setOn(false)}>
            <span className="addopt-ic"><Icon name={o.icon} /></span>
            <span className="addopt-t">{o.rec ? <span className="addopt-tag">Lo más rápido</span> : null}<b>{o.title}</b><small>{o.sub}</small></span>
            <Icon name="chevR" size={18} />
          </Link>
        ))}
      </div>
    </Sheet>
  );
}

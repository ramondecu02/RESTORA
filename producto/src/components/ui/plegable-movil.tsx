"use client";
// Filtros que en el móvil se esconden tras un botón («Filtros · 2») para que la lista llegue antes a la primera pantalla.
// En pantallas anchas no se nota: los controles salen siempre, en la misma fila.
import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

export function PlegableMovil({ activos = 0, etiqueta = "Filtros", children }: { activos?: number; etiqueta?: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className="btn btn-2 btn-sm plg-b" aria-expanded={abierto} aria-controls={id} onClick={() => setAbierto(!abierto)}>
        <Icon name="filter" size={16} /> {etiqueta}{activos ? <span className="cnt">{activos}</span> : null}
      </button>
      <div className="plg-c" id={id} data-open={abierto ? "" : undefined}>{children}</div>
    </>
  );
}

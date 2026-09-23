"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Confirm } from "@/components/ui/sheet";
import { toast, toastError } from "@/components/ui/toast";
import { borrarImport } from "./actions";

export function BorrarImport({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="iconbtn iconbtn-sm iconbtn-danger" aria-label="Borrar importación" onClick={() => setOpen(true)}><Icon name="trash" size={16} /></button>
      <Confirm open={open} onClose={() => setOpen(false)} title="¿Borrar esta importación?" danger confirm="Borrar" busy={pending}
        text="Se quitan sus ventas y se devuelve al inventario lo que se había descontado. Las unidades al mes de cada plato no cambian."
        onConfirm={() => start(async () => { const r = await borrarImport(id); if (r.ok) { toast(r.msg ?? "Borrado"); setOpen(false); } else toastError(r.error); })} />
    </>
  );
}

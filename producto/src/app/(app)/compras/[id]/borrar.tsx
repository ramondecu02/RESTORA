"use client";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Confirm } from "@/components/ui/sheet";
import { toastError } from "@/components/ui/toast";
import { borrar } from "../actions";

export function BorrarAlbaran({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-3 btn-sm" onClick={() => setOpen(true)}><Icon name="trash" size={18} /> Borrar {label}</button>
      <Confirm open={open} onClose={() => setOpen(false)} title={`¿Borrar este ${label}?`} danger confirm="Borrar" busy={pending}
        text="Se deshace todo lo que movió: el stock, el precio medio de cada artículo, las subidas de precio detectadas y el coste de tus platos."
        onConfirm={() => start(async () => { const r = await borrar(id); if (r && !r.ok) toastError(r.error); })} />
    </>
  );
}

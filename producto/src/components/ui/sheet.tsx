"use client";
// Hoja inferior en móvil / ventana centrada en escritorio. Se cierra con ✕, fondo o Escape.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";

export function Sheet({ open, onClose, title, sub, children, foot, wide, drawer, labelledBy }: {
  open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children?: ReactNode; foot?: ReactNode;
  wide?: boolean; drawer?: boolean; labelledBy?: string;
}) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(null);
  useEffect(() => { setRoot(document.getElementById("ovl-root")); }, []);
  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement;
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("[autofocus], input:not([type=hidden]), select, textarea, button:not(.sheet-x)");
      (el ?? ref.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); (prev.current as HTMLElement | null)?.focus?.(); };
  }, [open, onClose]);
  if (!open || !root) return null;
  const id = labelledBy ?? "sheet-title";
  return createPortal(
    <div className={`ov ${drawer ? "ov-drawer" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sheet ${wide ? "sheet-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-h">
          <div><h2 id={id}>{title}</h2>{sub ? <p>{sub}</p> : null}</div>
          <button type="button" className="iconbtn sheet-x" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        {children}
        {foot ? <div className="sheet-foot">{foot}</div> : null}
      </div>
    </div>,
    root,
  );
}

/** Confirmación sencilla para acciones que no se pueden deshacer. */
export function Confirm({ open, onClose, title, text, confirm, danger, onConfirm, busy }: {
  open: boolean; onClose: () => void; title: string; text: ReactNode; confirm: string; danger?: boolean; onConfirm: () => void; busy?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}
      foot={<>
        <button type="button" className="btn btn-3" onClick={onClose}>Cancelar</button>
        <button type="button" className={`btn ${danger ? "btn-danger" : ""}`} onClick={onConfirm} disabled={busy}>{busy ? <span className="spin" /> : null}{confirm}</button>
      </>}>
      <p className="muted">{text}</p>
    </Sheet>
  );
}

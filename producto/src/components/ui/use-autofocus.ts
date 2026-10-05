"use client";
import { useEffect, useRef } from "react";

/** Enfoca un campo al abrir la pantalla solo con ratón y teclado: en el móvil abriría el teclado y taparía el resto del formulario. */
export function useAutoFocusDesktop<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) ref.current?.focus(); }, []);
  return ref;
}

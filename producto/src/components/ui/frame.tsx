"use client";
import type { ReactNode } from "react";
import { Toasts } from "./toast";
import { TipLayer } from "./tip";

/** Contenedor de pantalla completa de la app (consulta de contenedor para el diseño adaptable). */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app" id="app">
      {children}
      <div id="ovl-root" />
      <Toasts />
      <TipLayer />
    </div>
  );
}

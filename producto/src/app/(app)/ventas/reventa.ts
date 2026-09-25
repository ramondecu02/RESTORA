// Tabla «Bebidas y reventa» de Ventas: qué compra, PVP y margen quedan al tocar un campo, y qué se guarda.
import { revMargen, revPvp } from "@/lib/costing";

/** conLineas: sale de un artículo y el coste se calcula con él. mRef: margen con el que se recalcula el PVP al cambiar la compra. */
export type FilaRev = { coste: number; pvp: number | null; iva: number; conLineas: boolean; mRef?: number | null };
export type CambioRev = { coste?: number | null; margen?: number; pvp?: number | null };
export type EnvioRev = { coste: number | null; margen: number | null; pvp: number | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Margen que se guarda: hacia abajo y con un decimal, para que el food cost real no quede por encima del objetivo (100 − margen). */
export const margenDe = (coste: number, pvp: number, iva: number) => Math.min(99, Math.max(0, Math.floor(revMargen(coste, pvp, iva) * 10 + 1e-9) / 10));

/** Nuevo estado de la fila y lo que se envía; null si no hay nada que hacer (la compra vacía o en 0 mientras se escribe, o calculada con el artículo). */
export function editarReventa(s: FilaRev, patch: CambioRev): { coste: number; pvp: number | null; mRef: number | null; envio: EnvioRev } | null {
  // El margen de referencia es el de antes de tocar la compra, no el de un valor a medio escribir («0» de «0,6»).
  let { coste, pvp } = s, mRef = s.mRef !== undefined ? s.mRef : s.pvp && s.coste > 0 ? revMargen(s.coste, s.pvp, s.iva) : null;
  if (patch.coste !== undefined) {
    if (s.conLineas || patch.coste == null || patch.coste <= 0) return null;
    coste = patch.coste;
    if (mRef != null) pvp = r2(revPvp(coste, mRef, s.iva));
  } else if (patch.margen !== undefined) {
    mRef = patch.margen;
    if (coste > 0) pvp = r2(revPvp(coste, mRef, s.iva));
  } else if (patch.pvp !== undefined) {
    pvp = patch.pvp != null && patch.pvp > 0 ? patch.pvp : null;
    mRef = pvp && coste > 0 ? revMargen(coste, pvp, s.iva) : null;
  }
  // Siempre la fila entera (compra, margen y PVP): si otro campo tenía un guardado pendiente, no se pierde.
  // Si sale de un artículo, la compra no se envía: manda el artículo.
  return { coste, pvp, mRef, envio: { coste: !s.conLineas && coste > 0 ? coste : null, margen: pvp && coste > 0 ? margenDe(coste, pvp, s.iva) : null, pvp } };
}

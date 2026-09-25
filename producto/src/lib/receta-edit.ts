// Utilidades puras de la ficha de escandallo, compartidas por el cliente y el servidor.
import { revMargen, revPvp } from "./costing";
import { toBase, type LineUnit } from "./units";

/**
 * Reventa: PVP con IVA para un margen, redondeado al céntimo hacia arriba.
 * Redondear hacia abajo dejaría el food cost un pelo por encima del objetivo (100 − margen) y el producto saldría «Ajustado».
 */
export const pvpDesdeMargen = (coste: number, margen: number, iva: number) => Math.ceil(revPvp(coste, margen, iva) * 100 - 1e-9) / 100;

/** Reventa: margen (0–99, con un decimal) que da un PVP, redondeado hacia abajo por la misma razón. */
export const margenDesdePvp = (coste: number, pvp: number, iva: number) =>
  Math.min(99, Math.max(0, Math.floor(revMargen(coste, pvp, iva) * 10 + 1e-9) / 10));

/** Cambia la unidad de una línea sin perder cantidades pequeñas (0,4 g → 0,0004 kg → 0,4 g). Solo quita el ruido de coma flotante. */
export const convertirCantidad = (q: number, de: LineUnit, a: LineUnit) => Math.round((toBase(q, de) / toBase(1, a)) * 1e6) / 1e6;

/**
 * Fusión a tres bandas al guardar una receta.
 * - cambiados: lo que el usuario ha tocado (entrada ≠ origen, la versión que cargó); solo eso se escribe.
 * - conflictos: lo que, además, otra persona cambió a la vez con otro valor (actual ≠ origen y actual ≠ entrada).
 */
export function fusionReceta<T extends Record<string, unknown>>(entrada: T, origen: T, actual: T) {
  const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const cambiados: (keyof T)[] = [], conflictos: (keyof T)[] = [];
  for (const k of Object.keys(entrada) as (keyof T)[]) {
    if (eq(entrada[k], origen[k])) continue;
    cambiados.push(k);
    if (!eq(actual[k], origen[k]) && !eq(actual[k], entrada[k])) conflictos.push(k);
  }
  return { cambiados, conflictos };
}

/** Borrador de la ficha: d es lo editado y o la versión del servidor de la que parte; saved, ya guardado y a la espera de los datos nuevos. */
export type Borrador<D> = { d: D; o: D; saved?: boolean };
type Igual<D> = (a: D, b: D) => boolean;

/** Lo que se ve: el borrador si tiene cambios o se acaba de guardar; si no, lo último que llegó del servidor. */
export function vistaBorrador<D>(b: Borrador<D> | null, base: D, igual: Igual<D>) {
  const live = b && (b.saved || !igual(b.d, b.o)) ? b : null;
  const d = live?.d ?? base;
  return { d, orig: live && !live.saved ? live.o : d, dirty: !!live && !live.saved };
}
/** Aplica un cambio sobre el borrador con cambios, sobre lo recién guardado (limpio) o, si no hay nada pendiente, sobre lo último del servidor. */
export function editarBorrador<D>(b: Borrador<D> | null, base: D, igual: Igual<D>, f: (x: D) => D, limpio: (x: D) => D = (x) => x): Borrador<D> {
  const cur = !b ? { d: base, o: base } : b.saved ? { d: limpio(b.d), o: limpio(b.d) } : !igual(b.d, b.o) ? b : { d: base, o: base };
  return { d: f(cur.d), o: cur.o };
}
/** Tras guardar lo enviado: si no se tocó nada mientras tanto, queda como guardado; si no, lo nuevo sigue pendiente sobre lo guardado. */
export const borradorGuardado = <D>(b: Borrador<D> | null, enviado: D): Borrador<D> | null => (b && b.d !== enviado ? { d: b.d, o: enviado } : b && { ...b, saved: true });
/** Llegan datos nuevos del servidor (al guardar, al subir la foto…): lo ya guardado se sustituye; un borrador con cambios se conserva. */
export const borradorAlRefrescar = <D>(b: Borrador<D> | null) => (b?.saved ? null : b);

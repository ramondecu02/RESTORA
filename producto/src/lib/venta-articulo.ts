// Artículos que se venden tal cual (vinos, cervezas, refrescos…): qué categorías son y cómo se calcula su margen.
import { neto, revMargen } from "./costing";
import { compatible, toBase, type BaseUnit, type LineUnit } from "./units";

/** Categorías del catálogo cuyo artículo es un producto final que se sirve sin transformar (el café es materia prima: va por kg). */
export const CATS_REVENTA = ["vino", "cerveza", "licor", "bebida", "refresco"] as const;
export const esReventa = (categoryId: string) => (CATS_REVENTA as readonly string[]).includes(categoryId);

/** Grupo de la carta donde cae el producto al crearlo (el mismo vocabulario que FAMILIAS de la carta). */
export const familiaReventa = (categoryId: string) =>
  categoryId === "vino" ? "Vinos" : categoryId === "cerveza" ? "Cervezas" : categoryId === "bebida" || categoryId === "refresco" ? "Refrescos" : "Bebidas";

/** Lo que se sirve en cada venta de un artículo, tal como lo guarda la receta de reventa: cantidad de artículo y raciones que salen de ella. */
export type Servido = { cantidad: number; unidad: LineUnit; raciones: number };

/** Raciones típicas para artículos que se miden en volumen: un clic las rellena (ml). */
export const SERVIDOS_ML = [{ ml: 750, t: "Botella 75 cl" }, { ml: 330, t: "Tercio 33 cl" }, { ml: 200, t: "Caña 20 cl" }, { ml: 150, t: "Copa 15 cl" }];

/** Si nadie lo dice: una unidad comprada es una venta. En kg o L no se adivina cuánto se sirve. */
export const servidoPorDefecto = (unit: BaseUnit): Servido | null => (unit === "ud" ? { cantidad: 1, unidad: "ud", raciones: 1 } : null);

/** Cuántas ventas salen de cada unidad comprada (una caja de 24, un barril de 30 L…). Solo cuenta en artículos que se miden en «ud». */
export const ventasPorUnidad = (s: Servido) => (s.cantidad > 0 ? s.raciones / s.cantidad : 1);
/** Lo que se sirve en cada venta, en la unidad de la receta: 0,33 L, 150 g… */
export const cantidadPorVenta = (s: Servido) => (s.raciones > 0 ? s.cantidad / s.raciones : s.cantidad);

/** Pistas del nombre del artículo: «caja 24», «12 × 1 L», «barril 30 L»… Ayudan a rellenar cuántas ventas salen de cada unidad. */
export function pistasPorEnvase(nombre: string): { n: number; t: string }[] {
  const t = nombre.toLowerCase().replace(/,/g, ".");
  const out: { n: number; t: string }[] = [];
  const caja = t.match(/\b(?:caja|pack|fardo|estuche|bandeja)\s*(?:de\s*)?(\d{1,3})\b/) ?? t.match(/\b(\d{1,3})\s*[x×]\s*\d/);
  if (caja) { const n = Number(caja[1]); if (n > 1 && n <= 500) out.push({ n, t: `Una por botella o lata (${n} por unidad)` }); }
  const barril = /barril|keg|bag.?in.?box|\bbib\b|garrafa/.test(t) ? t.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|lts|litros?)\b/) : null;
  if (barril) {
    const litros = Number(barril[1]);
    if (litros > 0 && litros <= 500) for (const [ml, n] of [[200, "caña 20 cl"], [330, "tercio 33 cl"], [500, "pinta 50 cl"]] as const) out.push({ n: Math.floor((litros * 1000) / ml), t: `${n[0].toUpperCase()}${n.slice(1)} (${Math.floor((litros * 1000) / ml)} por unidad)` });
  }
  return out;
}

/**
 * Margen de un producto final sobre la venta neta (sin IVA): (neto − coste) / neto.
 * coste: lo que cuesta una venta (precio neto del artículo × cantidad por venta ÷ raciones). null si no hay PVP o coste.
 */
export function margenVenta(coste: number | null, pvp: number | null, iva: number) {
  if (coste == null || coste <= 0 || !pvp || pvp <= 0) return null;
  return { margen: revMargen(coste, pvp, iva), beneficio: neto(pvp, iva) - coste };
}

/** Coste de una venta a partir del coste neto por unidad base del artículo y la cantidad servida (en cualquier unidad compatible). */
export function costeDeVenta(costeNetoBase: number | null, cantidad: number, unidad: LineUnit, unidadArticulo: BaseUnit, raciones = 1) {
  if (costeNetoBase == null || !compatible(unidadArticulo, unidad) || !(raciones > 0)) return null;
  return (costeNetoBase * toBase(cantidad, unidad)) / raciones;
}

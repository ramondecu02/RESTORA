// Precio medio ponderado (PMP) continuo y stock a partir del registro único de movimientos.
export type Mov = { cantidad: number; costeUnit: number | null; tipo: string; fecha: string | Date };

/** Aplica una entrada con coste al PMP: la existencia previa (si es positiva) pondera con la compra. */
export function applyPurchase(stock: number, pmp: number | null, q: number, unitCost: number): number {
  if (q <= 0) return pmp ?? unitCost;
  const s = Math.max(0, stock);
  if (pmp == null || s === 0) return unitCost;
  return (s * pmp + q * unitCost) / (s + q);
}
/** Reconstruye stock y PMP recorriendo los movimientos en orden (se usa al borrar un albarán). */
export function replay(movs: Mov[]): { stock: number; pmp: number | null } {
  const sorted = [...movs].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  let stock = 0;
  let pmp: number | null = null;
  for (const m of sorted) {
    if (m.cantidad > 0 && m.costeUnit != null && (m.tipo === "compra" || m.tipo === "inicial")) pmp = applyPurchase(stock, pmp, m.cantidad, m.costeUnit);
    stock += m.cantidad;
  }
  return { stock: Math.round(stock * 1000) / 1000, pmp };
}
/**
 * Coste unitario efectivo de una línea de compra, por unidad base:
 * importe = cantidad × precio × (1 − descuento); unidades totales = (cantidad + bonificadas) × factor.
 * Ej.: 6+1 botellas a 10 € → 60 € / 7 ud = 8,57 €/ud.
 */
export function lineaCoste(cantidad: number, precio: number, descuentoPct: number, bonificadas: number, factor: number) {
  const importe = cantidad * precio * (1 - (descuentoPct || 0) / 100);
  const unidades = (cantidad + (bonificadas || 0)) * (factor || 1);
  return { importe, unidades, costeUnit: unidades > 0 ? importe / unidades : 0 };
}

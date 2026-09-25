// Inventario: cobertura, estado y pedido sugerido (fórmulas del prototipo).
import type { Estado } from "./costing";
export function coberturaDias(stock: number, consumoSemanal: number | null | undefined): number {
  return consumoSemanal && consumoSemanal > 0 ? Math.max(0, stock) / (consumoSemanal / 7) : 99;
}
export function estadoStock(stock: number, minimo: number | null | undefined, dias: number): { estado: Estado; label: string } {
  if (minimo != null && stock < minimo) return { estado: "crit", label: "Bajo mínimo" };
  if (dias < 6) return { estado: "warn", label: "Ajustado" };
  return { estado: "ok", label: "Correcto" };
}
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Pedido sugerido para cubrir dos semanas.
 *  Con consumo conocido: si quedan menos de 14 días o se está bajo mínimo, lo que falta para dos semanas
 *  de consumo sin bajar del mínimo (2 × consumo + mínimo − stock).
 *  Sin consumo: solo si se está bajo mínimo, hasta el doble del mínimo. */
export function cantidadPedido(stock: number, minimo: number | null | undefined, consumoSemanal?: number | null): number {
  const bajoMinimo = minimo != null && stock < minimo;
  if (consumoSemanal != null && consumoSemanal > 0) {
    const dosSemanas = consumoSemanal * 2;
    if (stock >= dosSemanas && !bajoMinimo) return 0;
    return Math.max(0, r1(dosSemanas + Math.max(0, minimo ?? 0) - stock));
  }
  if (!bajoMinimo) return 0;
  return Math.max(0, r1(minimo! * 2 - stock));
}
/** Cobertura media en días de lo que tiene consumo conocido; null si no hay ninguno (sin consumo no hay cobertura que medir). */
export function coberturaMedia(items: { stock: number; consumo: number | null | undefined }[]): number | null {
  const con = items.filter((r) => r.consumo != null && r.consumo > 0);
  return con.length ? con.reduce((s, r) => s + Math.min(coberturaDias(r.stock, r.consumo), 99), 0) / con.length : null;
}
/** Número aceptable para stock, mínimo, consumo o precio: finito, no negativo y con un tope razonable. */
export const numValido = (n: unknown, max = 1e7): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
export const barraCobertura = (dias: number) => Math.max(4, Math.min(100, (dias / 21) * 100));

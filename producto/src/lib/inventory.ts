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
/** Pedido sugerido: para lo que está bajo mínimo, pedir hasta el doble del mínimo. */
export function cantidadPedido(stock: number, minimo: number | null | undefined): number {
  if (minimo == null || stock >= minimo) return 0;
  return Math.max(0, Math.round((minimo * 2 - stock) * 10) / 10);
}
export const barraCobertura = (dias: number) => Math.max(4, Math.min(100, (dias / 21) * 100));

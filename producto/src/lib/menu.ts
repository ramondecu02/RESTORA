// Ingeniería de menú, resumen de carta y salud del local (fórmulas del prototipo, sobre venta neta).
import { neto, type Estado } from "./costing";

export type DishStat = { id: string; name: string; familia: string; reventa: boolean; pvp: number | null; iva: number; coste: number; ventas: number; fcObjetivo: number };

export function resumenCarta(ds: DishStat[]) {
  let coste = 0, ingresos = 0, unidades = 0;
  for (const d of ds) {
    if (!d.pvp) continue;
    coste += d.coste * d.ventas;
    ingresos += neto(d.pvp, d.iva) * d.ventas;
    unidades += d.ventas;
  }
  const margen = ingresos - coste;
  return { coste, ingresos, unidades, margen, fc: ingresos > 0 ? coste / ingresos : null, ticketUnidad: unidades > 0 ? ingresos / unidades : null };
}
export const margenUnit = (d: DishStat) => (d.pvp ? neto(d.pvp, d.iva) - d.coste : 0);
export const aporta = (d: DishStat) => margenUnit(d) * d.ventas;

export function margenPorFamilia(ds: DishStat[]) {
  const m = new Map<string, number>();
  for (const d of ds) if (d.pvp) m.set(d.familia || "Otros", (m.get(d.familia || "Otros") || 0) + aporta(d));
  return [...m.entries()].map(([familia, margen]) => ({ familia, margen })).sort((a, b) => b.margen - a.margen);
}
export type Quad = "estrella" | "caballo" | "enigma" | "perro";
export const QUAD_INFO: Record<Quad, { label: string; consejo: string }> = {
  estrella: { label: "Estrella", consejo: "No lo toques." },
  caballo: { label: "Caballo de batalla", consejo: "Baja el coste antes que el precio." },
  enigma: { label: "Enigma", consejo: "Dale sitio en la carta." },
  perro: { label: "Perro", consejo: "Candidato a rehacer o retirar." },
};
export function cuadrantes(ds: DishStat[]) {
  const list = ds.filter((d) => d.pvp);
  const mV = list.length ? list.reduce((s, d) => s + d.ventas, 0) / list.length : 0;
  const mM = list.length ? list.reduce((s, d) => s + margenUnit(d), 0) / list.length : 0;
  const items = list.map((d) => {
    const pop = d.ventas >= mV, mar = margenUnit(d) >= mM;
    const quad: Quad = pop && mar ? "estrella" : pop ? "caballo" : mar ? "enigma" : "perro";
    return { id: d.id, name: d.name, familia: d.familia, ventas: d.ventas, margen: margenUnit(d), aporta: aporta(d), quad };
  });
  return { mV, mM, items };
}
export function salud(fc: number | null, fuera: number, bajos: number, objetivoPct: number): { estado: Estado; title: string } {
  const p = fc == null ? 0 : fc * 100;
  if (p <= objetivoPct && bajos <= 1 && fuera <= 2) return { estado: "ok", title: "El local va bien este mes" };
  if (p <= objetivoPct + 2 && bajos <= 3) return { estado: "warn", title: "Atención en un par de frentes" };
  return { estado: "crit", title: "Hay que tomar decisiones" };
}

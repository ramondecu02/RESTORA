// Unidades: los artículos se guardan en kg, L o ud. Las recetas pueden mostrarse en g o ml.
export type BaseUnit = "kg" | "L" | "ud";
export type LineUnit = "g" | "kg" | "ml" | "L" | "ud";

export const BASE_UNITS: BaseUnit[] = ["kg", "L", "ud"];
export const LINE_FACTOR: Record<LineUnit, number> = { g: 0.001, kg: 1, ml: 0.001, L: 1, ud: 1 };
export function lineUnitsFor(base: BaseUnit): LineUnit[] {
  return base === "kg" ? ["g", "kg"] : base === "L" ? ["ml", "L"] : ["ud"];
}
/** Unidad de receta por defecto, como en el prototipo: kg→g, L→ml, ud→ud. */
export const defaultLineUnit = (base: BaseUnit): LineUnit => (base === "kg" ? "g" : base === "L" ? "ml" : "ud");
export const toBase = (q: number, u: LineUnit) => q * LINE_FACTOR[u];
export const fromBase = (q: number, u: LineUnit) => q / LINE_FACTOR[u];
export function compatible(base: BaseUnit, u: LineUnit) {
  return lineUnitsFor(base).includes(u);
}

/**
 * Intenta deducir cuántas unidades base trae una unidad de compra a partir del texto del albarán.
 * "ACEITE OLIVA 5L" → {factor: 5, unit: "L"}; "MIX 125G" → {0.125, "kg"}; "HUEVO EST.30" → {30, "ud"}; "CAJA 24" → {24, "ud"}.
 */
export function inferPackFactor(text: string, base: BaseUnit): { factor: number; label: string } | null {
  const t = text.toUpperCase().replace(/,/g, ".");
  const w = t.match(/(\d+(?:\.\d+)?)\s*(KG|KILOS?|GR?|GRS|GRAMOS)\b/);
  const v = t.match(/(\d+(?:\.\d+)?)\s*(L|LT|LTS|LITROS?|CL|ML)\b/);
  const c = t.match(/\b(?:EST(?:UCHE)?|CAJA|CJ|PACK|BANDEJA|BDJ|X)\.?\s*(\d{1,3})\b/) || t.match(/\b(\d{1,3})\s*(?:UD|UDS|UNID(?:ADES)?|U)\b/);
  if (base === "kg" && w) {
    const n = Number(w[1]); const u = w[2];
    const kg = u.startsWith("K") ? n : n / 1000;
    if (kg > 0 && kg < 1000) return { factor: kg, label: `${w[1]} ${u.startsWith("K") ? "kg" : "g"}` };
  }
  if (base === "L" && v) {
    const n = Number(v[1]); const u = v[2];
    const l = u === "ML" ? n / 1000 : u === "CL" ? n / 100 : n;
    if (l > 0 && l < 1000) return { factor: l, label: `${v[1]} ${u === "ML" ? "ml" : u === "CL" ? "cl" : "L"}` };
  }
  if (base === "ud" && c) {
    const n = Number(c[1]);
    if (n > 1 && n <= 500) return { factor: n, label: `${n} ud` };
  }
  return null;
}

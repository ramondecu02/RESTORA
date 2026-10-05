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

const W = "KGS?|KILOS?|GRAMOS?|GRS?|G"; // pesos
const V = "LTS?|LITROS?|CL|ML|L"; // volúmenes
const NUM = "(\\d+(?:\\.\\d+)?)";
const enKg = (n: number, u: string) => (u.startsWith("K") ? n : n / 1000);
const enL = (n: number, u: string) => (u === "ML" ? n / 1000 : u === "CL" ? n / 100 : n);
const etiqueta = (n: number, u: string, base: "kg" | "L") => `${n} ${base === "kg" ? (u.startsWith("K") ? "kg" : "g") : u === "ML" ? "ml" : u === "CL" ? "cl" : "L"}`;
/** Unidades de compra que son un envase con varias piezas dentro: solo con ellas «24 uds de 33 cl» significa 24 × 33 cl. */
const UNIDAD_ENVASE = /^(CAJAS?|CJA?S?|PACKS?|PAQ(?:UETES?)?|FARDOS?|ESTUCHES?|BANDEJAS?|BDJ|SACOS?|BULTOS?)\b/;

/**
 * Intenta deducir cuántas unidades base trae una unidad de compra a partir del texto del albarán.
 * "ACEITE OLIVA 5L" → {factor: 5, unit: "L"}; "MIX 125G" → {0.125, "kg"}; "HUEVO EST.30" → {30, "ud"}; "CAJA 24" → {24, "ud"}.
 * Los envases con varias piezas multiplican: "CERVEZA 24X33CL" → 7,92 L; "REFRESCO 6 X 1 L" → 6 L; "AGUA 75CL X 6" → 4,5 L.
 * `unidad` es la unidad de compra impresa: «24 uds» con 33 cl solo se multiplica si es una caja, un pack, un fardo...
 */
export function inferPackFactor(text: string, base: BaseUnit, unidad = ""): { factor: number; label: string } | null {
  const t = text.toUpperCase().replace(/,/g, ".").replace(/[×*]/g, "X");
  const w = t.match(new RegExp(`${NUM}\\s*(${W})\\b`));
  const v = t.match(new RegExp(`${NUM}\\s*(${V})\\b`));
  const c = t.match(/\b(?:EST(?:UCHE)?|CAJA|CJ|PACK|BANDEJA|BDJ|X)\.?\s*(\d{1,3})\b/) || t.match(/\b(\d{1,3})\s*(?:UD|UDS|UNID(?:ADES)?|U)\b/);
  // N piezas de un tamaño: «6X1L», «24 X 33CL», «10 X 1 KG» (antes) o «75CL X 6» (después). Solo si la medida es del tipo del artículo (peso o volumen)
  const medida = base === "kg" ? W : base === "L" ? V : null;
  if (medida) {
    const antes = t.match(new RegExp(`\\b(\\d{1,3})\\s*X\\s*${NUM}\\s*(${medida})\\b`));
    const despues = t.match(new RegExp(`${NUM}\\s*(${medida})\\s*X\\s*(\\d{1,3})(?![\\d.]|\\s*(?:${W}|${V})\\b)`));
    const m = antes ? { n: Number(antes[1]), s: Number(antes[2]), u: antes[3] } : despues ? { n: Number(despues[3]), s: Number(despues[1]), u: despues[2] } : null;
    if (m && m.n > 1 && m.n <= 500 && m.s > 0) {
      const factor = m.n * (base === "kg" ? enKg(m.s, m.u) : enL(m.s, m.u));
      if (factor > 0 && factor < 1000) return { factor, label: `${m.n} × ${etiqueta(m.s, m.u, base as "kg" | "L")}` };
    }
    // «CAJA 24 UDS 33CL»: el recuento va aparte del tamaño, pero solo se multiplica si lo que se compra es el envase
    const piezas = t.match(/\b(\d{1,3})\s*(?:UD|UDS|UNID(?:ADES)?|U|BOT(?:ELLAS?|ELLINES?)?|LATAS?|BRIKS?|BOTES?)\b/);
    const med = base === "kg" ? w : v;
    if (piezas && med && UNIDAD_ENVASE.test(unidad.trim().toUpperCase())) {
      const n = Number(piezas[1]);
      const factor = n * (base === "kg" ? enKg(Number(med[1]), med[2]) : enL(Number(med[1]), med[2]));
      if (n > 1 && n <= 500 && factor > 0 && factor < 1000) return { factor, label: `${n} × ${etiqueta(Number(med[1]), med[2], base as "kg" | "L")}` };
    }
  }
  if (base === "kg" && w) {
    const n = Number(w[1]); const u = w[2];
    const kg = enKg(n, u);
    if (kg > 0 && kg < 1000) return { factor: kg, label: etiqueta(n, u, "kg") };
  }
  if (base === "L" && v) {
    const n = Number(v[1]); const u = v[2];
    const l = enL(n, u);
    if (l > 0 && l < 1000) return { factor: l, label: etiqueta(n, u, "L") };
  }
  if (base === "ud") {
    // «CAJA 6 X 1 L» en un artículo por unidades: 6 piezas
    const n6 = t.match(/\b(\d{1,3})\s*X\s*\d+(?:\.\d+)?\s*(?:KGS?|KILOS?|GRAMOS?|GRS?|G|LTS?|LITROS?|CL|ML|L)\b/);
    if (n6 && Number(n6[1]) > 1 && Number(n6[1]) <= 500) return { factor: Number(n6[1]), label: `${Number(n6[1])} ud` };
    if (c) {
      const n = Number(c[1]);
      if (n > 1 && n <= 500) return { factor: n, label: `${n} ud` };
    }
  }
  return null;
}

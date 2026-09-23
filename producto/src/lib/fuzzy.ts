// Emparejado difuso de textos de albarán con artículos y catálogo.
const STOP = new Set(["de", "del", "la", "el", "los", "las", "y", "con", "en", "al", "a", "kg", "g", "gr", "grs", "l", "lt", "ml", "cl", "ud", "uds", "unid", "caja", "cj", "est", "estuche", "bandeja", "bdj", "pack", "saco", "garrafa", "botella", "cat", "i", "ii", "extra", "x"]);
export function norm(s: string): string {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
/** Quita cantidades, unidades de envase y palabras vacías para comparar nombres de producto. */
export function core(s: string): string {
  return norm(s).split(" ").filter((w) => w && !STOP.has(w) && !/^\d+([.,]\d+)?[a-z]*$/.test(w)).join(" ");
}
function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = s.replace(/ /g, "");
  for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
export function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) || 0);
  return na + nb ? (2 * inter) / (na + nb) : 0;
}
/** Similitud 0..1 entre un texto leído y un nombre (o alias). Combina bigramas y palabras en común. */
export function similarity(text: string, name: string): number {
  const a = core(text), b = core(name);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = a.split(" "), tb = b.split(" ");
  const setB = new Set(tb);
  const common = ta.filter((w) => setB.has(w) || tb.some((x) => x.length > 3 && (x.startsWith(w) || w.startsWith(x)))).length;
  const tok = common / Math.max(ta.length, tb.length);
  const allNameWords = tb.every((w) => ta.some((x) => x === w || (w.length > 3 && x.startsWith(w.slice(0, Math.max(4, w.length - 2))))));
  const d = dice(a, b);
  let s = 0.55 * d + 0.45 * tok;
  if (allNameWords) s = Math.max(s, 0.86 + 0.1 * d);
  return Math.min(1, s);
}
export type Candidate<T> = { item: T; score: number };
export function bestMatches<T>(text: string, items: T[], names: (t: T) => string[], min = 0.35, limit = 5): Candidate<T>[] {
  const out: Candidate<T>[] = [];
  const nt = norm(text);
  for (const it of items) {
    let best = 0;
    for (const n of names(it)) {
      if (!n) continue;
      const s = norm(n) === nt ? 1 : similarity(text, n);
      if (s > best) best = s;
    }
    if (best >= min) out.push({ item: it, score: best });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, limit);
}

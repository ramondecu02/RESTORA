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
// Palabras que convierten un producto en otro (elaborado, en conserva, cortado...): «CEBOLLA FRITA» no es «Cebolla».
const PROCESADO = /^(?:pre)?(?:frit|cocid|asad|ahumad|confitad|encurtid|congelad|caramelizad|deshidratad|rellen|rebozad|empanad|marinad|cocinad|hervid|tostad|molid|rallad|picad|triturad|pelad|trocead|cortad|lonchead|laminad|filetead|limpi|negr|sec)(?:o|a|os|as)$|^(?:polvo|crujientes?|chips|salsa|zumo|pure|mermelada|escabeche|conserva|almibar)$/;
// Envases que a veces encabezan la línea («BOLSA DE PATATAS»): no cuentan como el producto.
const ENVASE = new Set(["bolsa", "malla", "manojo", "bote", "tarro", "lata", "brick", "paquete", "paq", "rollo", "cubo", "barqueta", "tarrina", "cesta", "docena", "bidon", "envase", "sobre"]);
const PREP = new Set(["de", "del", "en", "con", "al", "a"]);
const raiz = (w: string) => w.replace(/(?:es|s)$/, "").replace(/[aeo]$/, "");
/** Misma palabra salvo género y número («patatas» = «patata», «roja» = «rojo») o cortada por el final («lechug»).
 *  «aceituna» no es «aceite», ni «chips» es «chipirón». */
function igual(nombre: string, texto: string): boolean {
  if (nombre === texto) return true;
  if (nombre.length < 4 || texto.length < 4) return false;
  return raiz(nombre) === raiz(texto) || (texto.length >= 5 && nombre.startsWith(texto));
}
/** En un producto, el texto habla de otra cosa aunque contenga el nombre: está elaborado (frito, en polvo...)
 *  o el nombre va detrás de una preposición y lo que encabeza la línea es otro producto («SALSA DE TOMATE», «ATÚN EN ACEITE»). */
function otroProducto(text: string, ta: string[], tb: string[]): boolean {
  const cubre = (x: string) => tb.some((w) => igual(w, x));
  if (ta.some((x) => PROCESADO.test(x) && !cubre(x))) return true;
  const raw = norm(text).split(" ");
  const p = raw.findIndex((w, i) => i > 0 && PREP.has(w));
  if (p < 0) return false;
  const head = core(raw.slice(0, p).join(" ")).split(" ").filter((w) => w && !ENVASE.has(w));
  return head.length > 0 && !head.some(cubre);
}
/** Similitud 0..1 entre un texto leído y un nombre (o alias). Combina bigramas y palabras en común.
 *  Con `producto` (líneas de albarán) es más estricta: solo se da por bueno el nombre entero si el texto no habla de otro producto. */
export function similarity(text: string, name: string, producto = false): number {
  const a = core(text), b = core(name);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = a.split(" "), tb = b.split(" ");
  const setB = new Set(tb);
  const common = ta.filter((w) => setB.has(w) || tb.some((x) => x.length > 3 && (x.startsWith(w) || (producto ? igual(x, w) : w.startsWith(x))))).length;
  const tok = common / Math.max(ta.length, tb.length);
  const allNameWords = producto
    ? tb.every((w) => ta.some((x) => igual(w, x)))
    : tb.every((w) => ta.some((x) => x === w || (w.length > 3 && x.startsWith(w.slice(0, Math.max(4, w.length - 2))))));
  const d = dice(a, b);
  let s = 0.55 * d + 0.45 * tok;
  if (allNameWords) {
    // Producto distinto: queda como candidato, pero nunca se empareja solo
    if (producto && otroProducto(text, ta, tb)) return Math.min(s, 0.79);
    s = Math.max(s, 0.86 + 0.1 * d);
  }
  return Math.min(1, s);
}
export type Candidate<T> = { item: T; score: number };
export function bestMatches<T>(text: string, items: T[], names: (t: T) => string[], min = 0.35, limit = 5, producto = false): Candidate<T>[] {
  const out: Candidate<T>[] = [];
  const nt = norm(text);
  for (const it of items) {
    let best = 0;
    for (const n of names(it)) {
      if (!n) continue;
      const s = norm(n) === nt ? 1 : similarity(text, n, producto);
      if (s > best) best = s;
    }
    if (best >= min) out.push({ item: it, score: best });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, limit);
}

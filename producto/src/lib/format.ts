// Formato es-ES para toda la app.
// Agrupamos siempre los miles (8.901 €), también con cuatro cifras, para que las cifras se lean igual en toda la app.
const nf = (d: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
const nfCache = new Map<number, Intl.NumberFormat>();
function fmtN(n: number, d = 2): string {
  let f = nfCache.get(d);
  if (!f) { f = nf(d); nfCache.set(d, f); }
  return f.format(n);
}
export const num = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : fmtN(n, d));
export const eur = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : fmtN(n, d) + " €");
export const eur0 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "—" : fmtN(Math.round(n), 0) + " €");
/** Porcentaje a partir de una fracción (0,25 → "25,0 %"). */
export const pct = (x: number | null | undefined, d = 1) => (x == null || !Number.isFinite(x) ? "—" : fmtN(x * 100, d) + " %");
/** Porcentaje a partir de un número ya en % (25 → "25 %"). */
export const pctN = (x: number | null | undefined, d = 0) => (x == null || !Number.isFinite(x) ? "—" : fmtN(x, d) + " %");
export const qty = (n: number | null | undefined, maxD = 3) => {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: maxD, useGrouping: "always" }).format(Math.round(n * 1000) / 1000);
};
export const kEur = (n: number) => (Math.abs(n) >= 1000 ? fmtN(n / 1000, 1) + " k€" : fmtN(n, 0) + " €");
/** Convierte texto con coma o punto decimal a número. "1.234,56" → 1234.56; "0.25" → 0.25. */
export function parseNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let t = String(v ?? "").trim().replace(/\s|€|%/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
/** Zona horaria de los restaurantes: las fechas se calculan y se muestran en hora de Madrid, esté donde esté el servidor. */
export const TZ = "Europe/Madrid";
export function fecha(iso: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return "—";
  // Un día suelto (AAAA-MM-DD) se ancla a mediodía UTC: en Madrid sigue siendo ese mismo día.
  const d = typeof iso === "string" ? new Date(iso.length <= 10 ? iso + "T12:00:00Z" : iso) : iso;
  return d.toLocaleDateString("es-ES", { timeZone: TZ, ...opts });
}
export const fechaLarga = (iso: string | Date) => fecha(iso, { weekday: "long", day: "numeric", month: "long" });
export const fechaNum = (iso: string | Date | null | undefined) => fecha(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const plural = (n: number, a: string, b: string) => `${fmtN(n, 0)} ${n === 1 ? a : b}`;
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
/** Día (AAAA-MM-DD) de ese instante en Madrid; sin argumento, el día de hoy en el restaurante. */
export function isoDate(d: Date = new Date()): string {
  const p = Object.fromEntries(ymd.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function initials(name: string) {
  return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
/** "A, B y C" · "A, B, C y 5 más". */
export function lista(items: string[], max = 3): string {
  if (items.length > max) return items.slice(0, max).join(", ") + ` y ${items.length - max} más`;
  return items.length > 1 ? items.slice(0, -1).join(", ") + " y " + items[items.length - 1] : (items[0] ?? "");
}
/** "28,4 → 28,7 %" (antes y después, como fracciones). */
export const fcPar = (antes: number | null | undefined, despues: number | null | undefined) =>
  antes == null || !Number.isFinite(antes) ? pct(despues) : `${fmtN(antes * 100, 1)} → ${pct(despues)}`;
/** Los últimos n meses (AAAA-MM) hasta el actual en hora de Madrid, del más antiguo al actual. */
export function ultimosMeses(n: number, hoy: string = isoDate()): string[] {
  const [y, m] = hoy.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) { const t = y * 12 + (m - 1) - i; out.push(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`); }
  return out;
}

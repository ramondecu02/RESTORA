// Formato es-ES para toda la app.
const nf = (d: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
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
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: maxD }).format(Math.round(n * 1000) / 1000);
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
export function fecha(iso: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length <= 10 ? iso + "T12:00:00" : iso) : iso;
  return d.toLocaleDateString("es-ES", opts);
}
export const fechaLarga = (iso: string | Date) => fecha(iso, { weekday: "long", day: "numeric", month: "long" });
export const fechaNum = (iso: string | Date | null | undefined) => fecha(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const plural = (n: number, a: string, b: string) => `${fmtN(n, 0)} ${n === 1 ? a : b}`;
export function isoDate(d: Date = new Date()): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function initials(name: string) {
  return (name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// Lectura de CSV de ventas del TPV: separador, cabecera y columnas.
import Papa from "papaparse";
import { parseNum } from "./format";
import { norm } from "./fuzzy";

export type Mapping = { fecha: number | null; producto: number; unidades: number | null; importe: number | null; tickets: number | null };
export type ParsedCsv = { headers: string[]; rows: string[][]; mapping: Mapping | null; delimiter: string };

export function parseCsv(text: string): ParsedCsv {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy", delimiter: "" });
  const data = (res.data || []).filter((r) => r.some((c) => String(c).trim()));
  if (!data.length) return { headers: [], rows: [], mapping: null, delimiter: res.meta.delimiter };
  const headers = data[0].map((h) => String(h).trim());
  const rows = data.slice(1);
  return { headers, rows, mapping: guessMapping(headers, rows), delimiter: res.meta.delimiter };
}
export function guessMapping(headers: string[], rows: string[][]): Mapping | null {
  const h = headers.map((x) => norm(x));
  const find = (re: RegExp, not?: RegExp) => { const i = h.findIndex((x) => re.test(x) && !(not && not.test(x))); return i >= 0 ? i : null; };
  const producto = find(/producto|articulo|plato|descripcion|concepto|item|nombre|familia de venta/, /familia$/);
  const unidades = find(/unid|cantidad|uds|qty|cant\b|n vendid|vendid/);
  const importe = find(/importe|total|venta|facturad|neto|bruto|pvp total/, /unid|cantidad/);
  const fecha = find(/fecha|date|dia\b|jornada/);
  const tickets = find(/ticket|comensal|cubierto|pax/);
  if (producto == null) return null;
  // Si no hay importe, a veces hay "precio" unitario: se tratará como PVP unitario.
  if (importe == null && unidades == null && rows.length) return null;
  return { fecha, producto, unidades, importe, tickets };
}
export function parseFechaEs(v: string): string | null {
  const t = String(v || "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return null;
}
export type VentaRow = { fecha: string | null; producto: string; unidades: number; importe: number | null; tickets: number | null };
export function rowsFromMapping(rows: string[][], m: Mapping): VentaRow[] {
  const out: VentaRow[] = [];
  for (const r of rows) {
    const producto = String(r[m.producto] ?? "").trim();
    if (!producto || /^total/i.test(producto)) continue;
    const unidades = m.unidades != null ? parseNum(r[m.unidades]) ?? 0 : 1;
    const importe = m.importe != null ? parseNum(r[m.importe]) : null;
    if (!unidades && !importe) continue;
    out.push({ fecha: m.fecha != null ? parseFechaEs(r[m.fecha]) : null, producto, unidades, importe, tickets: m.tickets != null ? parseNum(r[m.tickets]) : null });
  }
  return out;
}

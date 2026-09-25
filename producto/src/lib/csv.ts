// Lectura de CSV de ventas del TPV: separador, cabecera, columnas, fechas y envío compacto al servidor.
import Papa from "papaparse";
import { parseNum } from "./format";
import { norm } from "./fuzzy";

export type Mapping = { fecha: number | null; producto: number; unidades: number | null; importe: number | null; tickets: number | null };
export type ParsedCsv = { headers: string[]; rows: string[][]; mapping: Mapping | null; delimiter: string };

/** Máximo de filas (ya agrupadas por producto y día) de una importación. */
export const MAX_FILAS = 50_000;

export function parseCsv(text: string): ParsedCsv {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy", delimiter: "" });
  const data = (res.data || []).filter((r) => r.some((c) => String(c).trim()));
  if (!data.length) return { headers: [], rows: [], mapping: null, delimiter: res.meta.delimiter };
  const headers = data[0].map((h) => String(h).trim());
  const rows = data.slice(1);
  return { headers, rows, mapping: guessMapping(headers, rows), delimiter: res.meta.delimiter };
}

/** Si la columna trae números (al menos el 80 % de las celdas con algo). */
const numerica = (rows: string[][], i: number) => {
  let n = 0, ok = 0;
  for (const r of rows.slice(0, 200)) { const v = String(r[i] ?? "").trim(); if (!v) continue; n++; if (parseNum(v) != null) ok++; }
  return !n || ok / n >= 0.8;
};
/**
 * Columna del importe: se puntúa cada cabecera (total o con IVA > importe o venta > neto o base) y se descartan
 * las que no son un importe de venta: fecha, punto o canal de venta, precio unitario, IVA, tickets… o sin números.
 */
function columnaImporte(h: string[], rows: string[][]): number | null {
  let best: number | null = null, top = 0;
  h.forEach((x, i) => {
    if (/unid|cantidad|\buds\b|qty|\bcant\b|vendid|fecha|date|\bdia\b|hora|punto|canal|centro|tipo|famil|zona|terminal|\bcaja\b|mesa|camarer|emplead|ticket|comensal|descuento|\bdto\b|porcentaje|margen|coste|costo|cuota|^iva$|importe iva$|total iva$/.test(x)) return;
    if (/precio|\bpvp\b/.test(x) && !/total/.test(x)) return;
    const s = /neto|sin iva|\bbase\b/.test(x) ? 1 : /con iva|iva incl|total|facturad/.test(x) && !/subtotal/.test(x) ? 3 : /importe|venta|bruto|subtotal|euros|\beur\b/.test(x) ? 2 : 0;
    if (s > top && numerica(rows, i)) { best = i; top = s; }
  });
  return best;
}
/** «Nº ticket», «Ticket», «Id ticket»: un número de ticket (se cuentan los distintos). «Tickets» o «Nº de tickets» es una cifra que se suma. */
export const esIdTicket = (header: string) => /\bticket\b/.test(norm(header));

export function guessMapping(headers: string[], rows: string[][]): Mapping | null {
  const h = headers.map((x) => norm(x));
  const find = (re: RegExp, not?: RegExp) => { const i = h.findIndex((x) => re.test(x) && !(not && not.test(x))); return i >= 0 ? i : null; };
  const producto = find(/producto|articulo|plato|descripcion|concepto|item|nombre|familia de venta/, /familia$/);
  const unidades = find(/unid|cantidad|uds|qty|cant\b|n vendid|vendid/);
  const importe = columnaImporte(h, rows);
  const fecha = find(/fecha|date|dia\b|jornada/);
  // Primero el número de ticket (en exportaciones por línea es lo único fiable); si no, comensales o tickets.
  const tickets = find(/\bticket\b/, /medi|promedio|importe|total|precio|valor/) ?? find(/comensal|cubierto|pax|tickets/, /medi|promedio|importe|precio|valor/);
  if (producto == null) return null;
  if (importe == null && unidades == null && rows.length) return null;
  return { fecha, producto, unidades, importe, tickets };
}

/** Fecha AAAA-MM-DD que existe de verdad (nada de 2024-02-31 o 2024-23-09). */
export function fechaIsoValida(s: unknown): s is string {
  const m = typeof s === "string" ? s.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100) return false;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}
export type OrdenFecha = "dmy" | "mdy";
const DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;
/** Día/mes (lo normal en España) salvo que ningún primer número pase de 12 y algún segundo sí: entonces mes/día, como en EE. UU. */
export function ordenFechas(vals: string[]): OrdenFecha {
  let dmy = false, mdy = false;
  for (const v of vals) {
    const m = String(v ?? "").trim().match(DMY);
    if (!m) continue;
    if (+m[1] > 12) dmy = true; else if (+m[2] > 12) mdy = true;
  }
  return mdy && !dmy ? "mdy" : "dmy";
}
export function parseFechaEs(v: string, orden: OrdenFecha = "dmy"): string | null {
  const t = String(v || "").trim();
  const p2 = (x: string) => x.padStart(2, "0");
  let iso: string | null = null;
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) iso = `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  else if ((m = t.match(DMY))) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    iso = orden === "mdy" ? `${y}-${p2(m[1])}-${p2(m[2])}` : `${y}-${p2(m[2])}-${p2(m[1])}`;
  }
  return fechaIsoValida(iso) ? iso : null;
}
/** Días de un periodo, ambos incluidos. */
export const diasPeriodo = (desde: string, hasta: string) => Math.max(1, Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5) + 1);
/** Periodo por defecto cuando el archivo no trae fechas (o solo una): con una fecha, ese día; sin ninguna, el mes anterior entero. */
export function periodoPorDefecto(fechas: string[], hoy: string): { desde: string; hasta: string } {
  if (fechas.length) return { desde: fechas[0], hasta: fechas[fechas.length - 1] };
  const [y, m] = hoy.split("-").map(Number);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: iso(new Date(Date.UTC(y, m - 2, 1))), hasta: iso(new Date(Date.UTC(y, m - 1, 0))) };
}

/** unidades: null si el archivo no las trae (el servidor las saca del importe y el PVP). ticket: el texto tal cual. */
export type VentaRow = { fecha: string | null; producto: string; unidades: number | null; importe: number | null; ticket: string | null };
export type Lectura = { rows: VentaRow[]; fechasNoValidas: number; orden: OrdenFecha };
export const rowsFromMapping = (rows: string[][], m: Mapping): VentaRow[] => leerVentas(rows, m).rows;
/** Filas válidas, cuántas se quedan fuera por una fecha que no se entiende y el orden de las fechas (día/mes o mes/día). */
export function leerVentas(rows: string[][], m: Mapping): Lectura {
  const out: VentaRow[] = [];
  const orden = m.fecha != null ? ordenFechas(rows.map((r) => r[m.fecha!])) : "dmy";
  let fechasNoValidas = 0;
  for (const r of rows) {
    const producto = String(r[m.producto] ?? "").trim();
    if (!producto || /^total/i.test(producto)) continue;
    const unidades = m.unidades != null ? parseNum(r[m.unidades]) : null;
    const importe = m.importe != null ? parseNum(r[m.importe]) : null;
    if (!unidades && !importe) continue;
    // Una fecha que no se entiende no se cambia por otra: la fila se deja fuera y se avisa.
    const txt = m.fecha != null ? String(r[m.fecha] ?? "").trim() : "";
    const fecha = txt ? parseFechaEs(txt, orden) : null;
    if (txt && !fecha) { fechasNoValidas++; continue; }
    const ticket = m.tickets != null ? String(r[m.tickets] ?? "").trim() || null : null;
    out.push({ fecha, producto, unidades, importe, ticket });
  }
  return { rows: out, fechasNoValidas, orden };
}

/** Comensales o tickets del archivo: con un número de ticket se cuentan los distintos (por día); con una cifra, se suman. */
export function contarTickets(rows: VentaRow[], header: string): { n: number; porId: boolean } | null {
  const con = rows.filter((r) => r.ticket);
  if (!con.length) return null;
  const porId = esIdTicket(header) || con.some((r) => parseNum(r.ticket) == null);
  if (porId) return { n: new Set(con.map((r) => `${r.fecha ?? ""}|${r.ticket}`)).size, porId };
  return { n: Math.round(con.reduce((s, r) => s + (parseNum(r.ticket) ?? 0), 0)), porId };
}

/** Fila compacta que viaja al servidor: [índice del producto, fecha AAAA-MM-DD o null, unidades o null, importe o null]. */
export type FilaVenta = [number, string | null, number | null, number | null];
/**
 * Junta las filas del mismo producto y día (y con los mismos datos presentes), así el envío pesa poco aunque el TPV
 * exporte cada línea de ticket, y las devoluciones y anulaciones (negativas) se restan de lo vendido.
 */
export function agruparVentas(rows: VentaRow[]): { productos: string[]; filas: FilaVenta[] } {
  const productos: string[] = [], idx = new Map<string, number>(), acc = new Map<string, FilaVenta>();
  for (const r of rows) {
    const k = norm(r.producto);
    let p = idx.get(k);
    if (p == null) { p = productos.push(r.producto.slice(0, 200)) - 1; idx.set(k, p); }
    const key = `${p}|${r.fecha ?? ""}|${r.unidades == null ? 0 : 1}|${r.importe == null ? 0 : 1}`;
    const f = acc.get(key);
    if (!f) acc.set(key, [p, r.fecha, r.unidades, r.importe]);
    else { if (f[2] != null) f[2] += r.unidades ?? 0; if (f[3] != null) f[3] += r.importe ?? 0; }
  }
  const filas: FilaVenta[] = [];
  for (const [p, f, u, i] of acc.values()) {
    const uds = u == null ? null : Math.round(u * 1000) / 1000, imp = i == null ? null : Math.round(i * 100) / 100;
    if (uds || imp) filas.push([p, f, uds, imp]);
  }
  return { productos, filas };
}

/** Revisa lo que llega al servidor (la acción es pública): el error para el usuario o null. */
export function errorVentas(productos: unknown, filas: unknown): string | null {
  if (!Array.isArray(productos) || !Array.isArray(filas)) return "Datos no válidos.";
  if (!filas.length) return "No hay filas que importar.";
  if (filas.length > MAX_FILAS || productos.length > MAX_FILAS) return "El archivo es demasiado grande. Divídelo por meses.";
  if (!productos.every((p) => typeof p === "string" && p.length <= 200)) return "Datos no válidos.";
  const num = (x: unknown, max: number) => x === null || (typeof x === "number" && Number.isFinite(x) && Math.abs(x) < max);
  for (const f of filas as unknown[]) {
    if (!Array.isArray(f) || f.length !== 4 || !Number.isInteger(f[0]) || f[0] < 0 || f[0] >= productos.length) return "Datos no válidos.";
    if (f[1] !== null && !fechaIsoValida(f[1])) return `Hay una fecha que no es válida (${String(f[1]).slice(0, 20)}).`;
    if (!num(f[2], 1e6) || !num(f[3], 1e7)) return "Hay unidades o importes que no son válidos.";
  }
  return null;
}

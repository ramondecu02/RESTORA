// CSV para Excel (separador «;», coma decimal y BOM UTF-8), a salvo de fórmulas.
export type Cell = string | number | null | undefined;

/** Un texto que empieza por =, +, -, @, tabulador o retorno Excel lo toma por fórmula: se le antepone una comilla simple. */
const FORMULA = /^[=+\-@\t\r]/;

export const cell = (v: Cell) => {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.round(v * 10000) / 10000).replace(".", ",") : "";
  const s = FORMULA.test(String(v)) ? "'" + String(v) : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = (rows: Cell[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";

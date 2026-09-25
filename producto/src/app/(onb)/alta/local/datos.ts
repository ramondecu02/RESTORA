// Lectura y validación del formulario «Tu local» del alta. Sin acceso a datos: se prueba en tests/unit.
import { parseNum } from "@/lib/format";

export const COMENSALES_MAX = 100_000;

/** Entero escrito a la española: el punto y el espacio agrupan miles ("1.200" y "1 200" → 1200) y "120,0" → 120.
 *  Devuelve null si está vacío y NaN si no es un número entero ("1,5", "1.5", "abc"). */
export function parseEntero(v: unknown): number | null {
  const t = String(v ?? "").trim().replace(/\s/g, "");
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  const n = parseNum(t);
  return n != null && Number.isInteger(n) ? n : NaN;
}

export type LocalVals = { name: string; address: string; postal_code: string; ciudad: string; iva_venta: number; fc_objetivo: number; comensales_dia: number | null };

/** Lee el formulario: valores limpios, lo que escribió el usuario (para devolvérselo si hay errores) y los errores por campo.
 *  Un nombre vacío queda vacío: la acción pone el del negocio. */
export function leerLocal(f: FormData): { vals: LocalVals; values: Record<string, string>; fields?: Record<string, string> } {
  const txt = (k: string) => String(f.get(k) ?? "").trim();
  const values = { name: txt("name"), address: txt("address"), postal_code: txt("postal_code"), ciudad: txt("ciudad"), fc_objetivo: txt("fc_objetivo"), comensales_dia: txt("comensales_dia") };
  const fields: Record<string, string> = {};
  if (values.name.length === 1) fields.name = "Pon el nombre del local.";
  const fc = values.fc_objetivo ? parseNum(values.fc_objetivo) : 30;
  if (fc == null || !(fc >= 5 && fc <= 80)) fields.fc_objetivo = "Pon un porcentaje entre 5 y 80.";
  // 0 equivale a dejarlo en blanco, como en Cuenta.
  const com = parseEntero(values.comensales_dia);
  if (com != null && com !== 0 && !(com >= 1 && com <= COMENSALES_MAX)) fields.comensales_dia = "Escribe un número entero entre 1 y 100.000.";
  return {
    vals: {
      name: values.name.slice(0, 80), address: values.address.slice(0, 160), postal_code: values.postal_code.slice(0, 10), ciudad: values.ciudad.slice(0, 60),
      iva_venta: Number(f.get("iva_venta")) === 21 ? 21 : 10, fc_objetivo: fc ?? 30, comensales_dia: com ? com : null,
    },
    values,
    fields: Object.keys(fields).length ? fields : undefined,
  };
}

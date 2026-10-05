// Envoltorio común de las acciones de servidor: errores de usuario → mensaje; el resto → registro y mensaje genérico.
import { unstable_rethrow } from "next/navigation";
import { UserError } from "./ctx";
import { OcrError } from "./ocr/errors";

export type Result<T = undefined> = { ok: true; data?: T; msg?: string } | { ok: false; error: string; fields?: Record<string, string> };

export async function run<T>(fn: () => Promise<Result<T> | void>): Promise<Result<T>> {
  try {
    const r = await fn();
    return r ?? { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    // Los errores de la IA ya traen su mensaje listo para el usuario (el detalle técnico está en los registros)
    if (e instanceof UserError || e instanceof OcrError) return { ok: false, error: e.message };
    const pg = e as { code?: string; constraint?: string };
    if (pg.code === "23505") return { ok: false, error: "Ya existe un registro con ese nombre." };
    if (pg.code === "23503") return { ok: false, error: "No se puede borrar: está en uso en otros datos." };
    console.error("[accion]", e);
    return { ok: false, error: "No se ha podido guardar. Inténtalo de nuevo en un momento." };
  }
}
export const fail = (error: string, fields?: Record<string, string>): Result<never> => ({ ok: false, error, fields });

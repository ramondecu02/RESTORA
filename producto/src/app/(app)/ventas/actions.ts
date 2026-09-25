"use server";
import { refresh } from "next/cache";
import { isUuid } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { borrarImportacion, importarVentas, type ImportIn, type ImportRes } from "@/server/domain/ventas";

/** Si ya hay ventas importadas de esas fechas, devuelve `solape` para que el usuario confirme (y reenvíe con `forzar`). */
export async function importar(input: ImportIn): Promise<ImportRes | { ok: false; error: string; solape?: undefined }> {
  const r = await run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "ventas");
    return { ok: true as const, data: await importarVentas(ctx, input) };
  });
  if (!r.ok) return { ok: false, error: r.error };
  return r.data!;
}
export async function borrarImport(id: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "ventas");
    if (!isUuid(id)) throw new UserError("Importación no válida.");
    await borrarImportacion(ctx, id);
    refresh();
    return { ok: true, msg: "Importación borrada; el stock vuelve a como estaba." };
  });
}

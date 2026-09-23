"use server";
import { refresh } from "next/cache";
import { isUuid } from "@/server/db";
import { requireApp, requirePerm, UserError } from "@/server/ctx";
import { run, type Result } from "@/server/action";
import { borrarImportacion, importarVentas, type ImportIn } from "@/server/domain/ventas";

export async function importar(input: ImportIn): Promise<Result<{ id: string; filas: number; total: number; sinAsignar: number; recetas: number; articulos: number; desde: string; hasta: string }>> {
  return run(async () => {
    const ctx = await requireApp();
    requirePerm(ctx, "ventas");
    if (!input.rows.length) throw new UserError("No hay filas que importar.");
    const r = await importarVentas(ctx, input);
    return { ok: true, data: r };
  });
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

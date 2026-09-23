// Catálogo base del sector (global, no cambia en ejecución): se cachea en memoria.
import { all, sys } from "../db";
import type { BaseUnit } from "@/lib/units";

export type CatCategory = { id: string; name: string; singular: string; iva: number; kind: "cocina" | "bebida" | "otros"; orden: number };
export type CatItem = { id: string; name: string; category_id: string; unit: BaseUnit; rend: number; aliases: string[] };

let cache: { cats: CatCategory[]; items: CatItem[]; at: number } | null = null;
export async function getCatalog() {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache;
  const [cats, items] = await sys(async (c) => [
    await all<CatCategory>(c, "select id, name, singular, iva, kind, orden from catalog_categories order by orden, name"),
    await all<CatItem>(c, "select id, name, category_id, unit, rend, aliases from catalog_items order by name"),
  ] as const);
  cache = { cats, items, at: Date.now() };
  return cache;
}
export const KIND_LABEL: Record<string, string> = { cocina: "Materia prima", bebida: "Bebidas", otros: "No alimentario" };

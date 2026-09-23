import { all, type Db } from "../db";
import { costeNeto } from "@/lib/costing";
import { PLANTILLAS } from "@/lib/plantillas";
import { toBase } from "@/lib/units";
import { toArtCost, type ArtRow } from "../domain/costs";

/** Coste por ración de cada plantilla con los precios del local (null si falta algún precio importante). */
export async function plantillasConCoste(c: Db, localId: string) {
  const arts = await all<ArtRow>(c, `select id, name, unit, rend, pmp, last_price, last_purchase_at, precio_manual, precio_manual_at, category_id, iva, stock, stock_min,
    consumo_semanal, track_stock, last_proveedor_id, proveedor_pref_id, catalog_item_id, aliases, demo, foto_key from articulos where local_id = $1 and not archived and catalog_item_id is not null`, [localId]);
  const byCat = new Map(arts.map((a) => [a.catalog_item_id!, a]));
  return PLANTILLAS.map((p) => {
    let total = 0, faltan = 0, conPrecio = 0;
    for (const l of p.lineas) {
      const a = byCat.get(l.cat);
      const uc = a ? costeNeto(toArtCost(a)) : null;
      if (uc == null) { faltan++; continue; }
      conPrecio++;
      total += uc * toBase(l.q, l.u);
    }
    return { key: p.key, name: p.name, raciones: p.raciones, coste: faltan ? null : total / p.raciones, conPrecio, faltan, pvp: p.pvp };
  });
}

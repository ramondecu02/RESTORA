// Capa anónima: rango de precios que pagan otros restaurantes por el mismo producto del catálogo.
// Solo se muestra con al menos 5 negocios distintos (k-anonimato), sin contar el tuyo, y cada negocio
// pesa lo mismo (primero su mediana, luego los percentiles entre negocios).
import { hmac } from "../crypto";
import { one, type Db } from "../db";

export type Bench = { n: number; p25: number; p50: number; p75: number; zona: "provincia" | "españa" };
const K = 5;

export async function benchPrecio(c: Db, tenantId: string, catalogItemId: string | null, unit: string, postalCode: string): Promise<Bench | null> {
  if (!catalogItemId) return null;
  const me = hmac("bench:" + tenantId);
  const q = (region: string) => one<{ n: number; p25: number; p50: number; p75: number }>(c, `
    with per as (
      select contributor, percentile_cont(0.5) within group (order by price_per_unit) as p
      from bench_price_obs
      where catalog_item_id = $1 and unit = $2 and week >= current_date - 84 and contributor <> $3 and ($4 = '' or region = $4)
      group by contributor
    )
    select count(*)::int as n, percentile_cont(0.25) within group (order by p)::float as p25,
      percentile_cont(0.5) within group (order by p)::float as p50, percentile_cont(0.75) within group (order by p)::float as p75
    from per having count(*) >= ${K}`, [catalogItemId, unit, me, region]);
  const prov = postalCode.length >= 2 ? await q(postalCode.slice(0, 2)) : null;
  if (prov) return { ...prov, zona: "provincia" };
  const es = await q("");
  return es ? { ...es, zona: "españa" } : null;
}

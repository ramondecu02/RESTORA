// Capa anónima: rango de precios que pagan otros restaurantes por el mismo producto del catálogo.
// Solo se muestra con al menos 5 negocios distintos (k-anonimato), sin contar el tuyo, y cada negocio
// pesa lo mismo (primero su mediana, luego los percentiles entre negocios).
//
// Contra cuentas falsas creadas para aislar el precio de un competidor:
// - solo cuenta un negocio que aporta compras durante al menos una semana real (created_at, que pone el
//   servidor; la fecha del albarán la escribe el usuario y no sirve), así no basta con abrir cuentas y
//   meter albaranes el mismo día;
// - los percentiles se publican redondeados a dos cifras significativas, no el precio exacto de nadie.
// Riesgo residual: quien mantenga cuatro negocios falsos aportando precios durante más de una semana, en
// una provincia donde solo compre un competidor, puede seguir acotando su precio (con el margen del redondeo).
// Cerrarlo del todo exigiría contar solo negocios de pago o verificados, o limitar cuántos negocios crea una
// misma persona.
import { hmac } from "../crypto";
import { one, type Db } from "../db";

export type Bench = { n: number; p25: number; p50: number; p75: number; zona: "provincia" | "españa" };
const K = 5;

/** Redondea a dos cifras significativas (13,37 → 13; 1,234 → 1,2; 0,456 → 0,46). */
export function redondeoBench(p: number): number {
  if (!Number.isFinite(p) || p <= 0) return p;
  const paso = 10 ** (Math.floor(Math.log10(p)) - 1);
  return Math.round(Math.round(p / paso) * paso * 1e6) / 1e6;
}

export async function benchPrecio(c: Db, tenantId: string, catalogItemId: string | null, unit: string, postalCode: string): Promise<Bench | null> {
  if (!catalogItemId) return null;
  const me = hmac("bench:" + tenantId);
  const q = (region: string) => one<{ n: number; p25: number; p50: number; p75: number }>(c, `
    with per as (
      select contributor, percentile_cont(0.5) within group (order by price_per_unit) as p
      from bench_price_obs
      where catalog_item_id = $1 and unit = $2 and week >= current_date - 84 and contributor <> $3 and ($4 = '' or region = $4)
      group by contributor
      having max(created_at) - min(created_at) >= interval '7 days'
    )
    select count(*)::int as n, percentile_cont(0.25) within group (order by p)::float as p25,
      percentile_cont(0.5) within group (order by p)::float as p50, percentile_cont(0.75) within group (order by p)::float as p75
    from per having count(*) >= ${K}`, [catalogItemId, unit, me, region]);
  const redondear = (b: { n: number; p25: number; p50: number; p75: number }) => ({ n: b.n, p25: redondeoBench(b.p25), p50: redondeoBench(b.p50), p75: redondeoBench(b.p75) });
  const prov = postalCode.length >= 2 ? await q(postalCode.slice(0, 2)) : null;
  if (prov) return { ...redondear(prov), zona: "provincia" };
  const es = await q("");
  return es ? { ...redondear(es), zona: "españa" } : null;
}

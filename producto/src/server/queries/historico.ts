// Histórico mensual de ventas importadas (los cinco meses cerrados anteriores al actual), para fichas y gráficas.
import { all, type Db } from "../db";
import type { HistMes } from "@/lib/series";

// Los límites van como date (::date): comparar la columna date con un timestamptz usa un operador que Postgres no considera «leakproof» y, con RLS, no
// lo deja entrar en el índice (tenant_id, local_id, fecha): recorre todas las ventas del local y descarta las viejas. Con date entra y lee solo los meses.
export async function histVentas(c: Db, localId: string): Promise<HistMes[]> {
  return all<HistMes>(c, `select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, sum(neto)::float as neto, sum(coste_total)::float as coste, sum(unidades)::float as uds
    from ventas_lineas where local_id = $1 and fecha >= (date_trunc('month', current_date) - interval '5 months')::date and fecha < date_trunc('month', current_date)::date group by 1 order by 1`, [localId]);
}

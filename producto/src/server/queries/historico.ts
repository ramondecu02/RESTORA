// Histórico mensual de ventas importadas (los cinco meses cerrados anteriores al actual), para fichas y gráficas.
import { all, type Db } from "../db";
import type { HistMes } from "@/lib/series";

export async function histVentas(c: Db, localId: string): Promise<HistMes[]> {
  return all<HistMes>(c, `select to_char(date_trunc('month', fecha), 'YYYY-MM') as mes, sum(neto)::float as neto, sum(coste_total)::float as coste, sum(unidades)::float as uds
    from ventas_lineas where local_id = $1 and fecha >= date_trunc('month', current_date) - interval '5 months' and fecha < date_trunc('month', current_date) group by 1 order by 1`, [localId]);
}

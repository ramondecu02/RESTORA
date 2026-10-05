import { mensajeTopeLecturas } from "@/lib/limits";
import { one, sys, withTenant } from "./db";
import { env } from "./env";

/** Ventana fija guardada en Postgres. Devuelve true si la acción está permitida. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const r = await sys((c) => c.query<{ count: number }>(
    `insert into rate_limits (key, count, window_start) values ($1, 1, now())
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count`, [key, windowSec]));
  return (r.rows[0]?.count ?? 0) <= limit;
}

/**
 * Lecturas con IA que lleva el negocio en el mes natural en curso (hora de Madrid): los documentos subidos para leer con Claude (albaranes,
 * facturas y cartas) más los reintentos de lectura, que cuestan igual y no crean un documento nuevo. No cuentan los de ejemplo (se leen sin
 * llamar a la API), los de datos simulados, los de datos de ejemplo del negocio ni lo apuntado a mano.
 */
export async function lecturasDelMes(tenantId: string): Promise<number> {
  return withTenant(tenantId, async (c) => {
    const r = await one<{ n: number }>(c, `
      with mes as (select date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as desde)
      select (select count(*) from documentos d, mes where d.tenant_id = $1 and d.source = 'ocr' and not d.demo and d.created_at >= mes.desde
                and (d.ocr_model is null or d.ocr_model not in ('ejemplo', 'mock')))
           + (select count(*) from audit_log a, mes where a.tenant_id = $1 and a.entity = 'documento' and a.action = 'reintentar' and a.created_at >= mes.desde) as n`, [tenantId]);
    return r?.n ?? 0;
  });
}

export type TopeLecturas = { usadas: number; max: number; restantes: number; agotado: boolean; mensaje: string };
/** Cuántas lecturas con IA lleva el negocio este mes, cuántas le permite MAX_LECTURAS_MES y el mensaje para cuando se acaban. */
export async function topeDeLecturas(tenantId: string): Promise<TopeLecturas> {
  const max = env.maxLecturasMes;
  const usadas = await lecturasDelMes(tenantId);
  return { usadas, max, restantes: Math.max(0, max - usadas), agotado: usadas >= max, mensaje: mensajeTopeLecturas(max) };
}

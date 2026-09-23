import { sys } from "./db";

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

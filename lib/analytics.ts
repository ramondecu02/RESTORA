import { APP_URL } from "./site";

// Parámetros de campaña que viajan desde la web hasta el registro de la app. Solo se leen de la dirección de la página
// y se guardan en memoria mientras dure la visita: nada en cookies ni en el navegador (la web dice «sin cookies de rastreo»).
// La medición de visitas (Cloudflare Web Analytics, sin cookies) la activa el propietario desde su panel; no hay código aquí.
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/** Los utm_* de una cadena de búsqueda: sin los vacíos y con cada valor recortado a 100 caracteres. */
export function utmFromSearch(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k)?.trim().slice(0, 100);
    if (v) out[k] = v;
  }
  return out;
}

/** Añade los utm_* a un enlace de la app sin pisar los que ya lleve; cualquier otro enlace se devuelve igual. */
export function withUtm(href: string, utm: Record<string, string>): string {
  if (Object.keys(utm).length === 0) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (url.origin !== new URL(APP_URL).origin) return href;
  for (const [k, v] of Object.entries(utm)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
  return url.toString();
}

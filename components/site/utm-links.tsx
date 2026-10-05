"use client";

import { useEffect } from "react";
import { utmFromSearch, withUtm } from "@/lib/analytics";
import { APP_URL } from "@/lib/site";

// Si la visita llega con utm_* en la dirección (un anuncio, un correo, una publicación), los enlaces a la app los llevan consigo
// para que el registro sepa de dónde viene. En memoria: se pierden al recargar o al salir de la web, y no se guarda nada.
let guardados: Record<string, string> = {};

export function UtmLinks() {
  useEffect(() => {
    const propios = utmFromSearch(window.location.search);
    if (Object.keys(propios).length > 0) guardados = propios;
    const aplicar = () => {
      if (Object.keys(guardados).length === 0) return;
      document.querySelectorAll<HTMLAnchorElement>(`a[href^="${APP_URL}"]`).forEach((a) => {
        const nuevo = withUtm(a.href, guardados);
        if (nuevo !== a.href) a.href = nuevo;
      });
    };
    aplicar();
    // Las páginas cambian sin recargar: los enlaces nuevos también se revisan (solo hijos, así que no se vuelve a disparar al cambiar un href).
    const observador = new MutationObserver(aplicar);
    observador.observe(document.body, { childList: true, subtree: true });
    return () => observador.disconnect();
  }, []);
  return null;
}

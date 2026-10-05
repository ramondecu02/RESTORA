import type { Locale } from "./types";

// Textos sueltos que el código aún lee fuera de lib/site-copy.ts: el rótulo de la guía de marca (/marca) y las etiquetas de rol.
// El copy de la web pública vive en lib/site-copy.ts y lib/copy/*.ts. (El diccionario completo de la primera versión de la web se retiró:
// llevaba textos y precios de aquella etapa que ya no valen.)

const es = {
  brand: { kicker: "Identidad", title: "El plato inteligente" },
  lead: { roles: ["Jefe de cocina", "Gestor / responsable de costes", "Propietario"] },
};

export type Dictionary = typeof es;

const ca: Dictionary = {
  brand: { kicker: "Identitat", title: "El plat intel·ligent" },
  lead: { roles: ["Cap de cuina", "Gestor / responsable de costos", "Propietari"] },
};

const dictionaries: Record<Locale, Dictionary> = { es, ca };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

import { getDictionary } from "./dictionaries";
import { LEAD_ROLES, type LeadRole, type LeadStatus, type Locale } from "./types";

export { getDictionary };
export type { Dictionary } from "./dictionaries";

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "ES",
  ca: "CA",
};

export function otherLocale(locale: Locale): Locale {
  return locale === "es" ? "ca" : "es";
}

// Role / status labels used inside the internal admin panel (Spanish).
export const ROLE_LABELS_ADMIN: Record<LeadRole, string> = {
  jefe_cocina: "Jefe de cocina",
  gestor: "Gestor / responsable de costes",
  propietario: "Propietario",
};

export const STATUS_LABELS_ADMIN: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  descartado: "Descartado",
};

// Localized <option> list for the public lead form. Order mirrors LEAD_ROLES
// so the stored key always matches the label the visitor picked.
export function roleOptions(locale: Locale): { value: LeadRole; label: string }[] {
  const dict = getDictionary(locale);
  return LEAD_ROLES.map((value, index) => ({
    value,
    label: dict.lead.roles[index],
  }));
}

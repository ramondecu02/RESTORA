// Shared domain types and allowed-value tables.
// Kept framework-agnostic so both server and client code can import them.

export const LOCALES = ["es", "ca"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// Lead role — stored as a stable key, shown with a localized label.
export const LEAD_ROLES = ["jefe_cocina", "gestor", "propietario"] as const;
export type LeadRole = (typeof LEAD_ROLES)[number];

export function isLeadRole(value: string | undefined | null): value is LeadRole {
  return typeof value === "string" && (LEAD_ROLES as readonly string[]).includes(value);
}

// Lead lifecycle status (managed from the admin panel).
export const LEAD_STATUSES = ["nuevo", "contactado", "descartado"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: string | undefined | null): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value);
}

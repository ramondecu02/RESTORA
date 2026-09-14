import {
  DEFAULT_LOCALE,
  isLeadRole,
  isLocale,
  type LeadRole,
  type Locale,
} from "./types";

export interface LeadInput {
  restaurant: string;
  role: LeadRole;
  city: string;
  pos: string | null;
  lang: Locale;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

const MAX_SHORT = 120;
const MAX_LONG = 2000;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate + normalize a public lead submission.
 * `restaurant` and `city` are required; `role` must be a known key;
 * `pos` is optional; `lang` falls back to the default locale.
 */
export function parseLeadInput(raw: Record<string, unknown>): ParseResult<LeadInput> {
  const errors: Record<string, string> = {};

  const restaurant = asString(raw.restaurant).slice(0, MAX_SHORT);
  if (!restaurant) errors.restaurant = "required";

  const city = asString(raw.city).slice(0, MAX_SHORT);
  if (!city) errors.city = "required";

  const roleRaw = asString(raw.role);
  if (!isLeadRole(roleRaw)) errors.role = "invalid";

  const posRaw = asString(raw.pos).slice(0, MAX_SHORT);
  const pos = posRaw.length > 0 ? posRaw : null;

  const langRaw = asString(raw.lang);
  const lang: Locale = isLocale(langRaw) ? langRaw : DEFAULT_LOCALE;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      restaurant,
      role: roleRaw as LeadRole,
      city,
      pos,
      lang,
    },
  };
}

/** Validate an admin update to a lead (status and/or notes). */
export function parseLeadUpdate(
  raw: Record<string, unknown>,
): ParseResult<{ status?: string; notes?: string | null }> {
  const patch: { status?: string; notes?: string | null } = {};
  const errors: Record<string, string> = {};

  if (raw.status !== undefined) {
    const status = asString(raw.status);
    // Allowed statuses are validated by the caller against LEAD_STATUSES.
    if (!status) errors.status = "invalid";
    else patch.status = status;
  }

  if (raw.notes !== undefined) {
    const notes = asString(raw.notes).slice(0, MAX_LONG);
    patch.notes = notes.length > 0 ? notes : null;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: patch };
}

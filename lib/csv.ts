import type { Lead } from "@prisma/client";

const COLUMNS = [
  "id",
  "created_at",
  "restaurant",
  "role",
  "city",
  "pos",
  "lang",
  "status",
  "source",
  "message",
  "notes",
] as const;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  // Quote if the cell contains a delimiter, quote or newline (RFC 4180).
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serialize leads to RFC-4180 CSV. A BOM is prepended for Excel/UTF-8. */
export function leadsToCsv(leads: Lead[]): string {
  const rows: string[] = [];
  rows.push(COLUMNS.join(","));
  for (const lead of leads) {
    rows.push(
      [
        lead.id,
        lead.createdAt,
        lead.restaurant,
        lead.role,
        lead.city,
        lead.pos,
        lead.lang,
        lead.status,
        lead.source,
        lead.message,
        lead.notes,
      ]
        .map(escapeCell)
        .join(","),
    );
  }
  return "﻿" + rows.join("\r\n");
}

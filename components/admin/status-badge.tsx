import { STATUS_LABELS_ADMIN } from "@/lib/i18n";
import { isLeadStatus, type LeadStatus } from "@/lib/types";

const STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: "var(--brand)",
  contactado: "#2f9e56",
  descartado: "var(--muted)",
};

export function StatusBadge({ status }: { status: string }) {
  const known = isLeadStatus(status);
  const color = known ? STATUS_COLORS[status] : "var(--muted)";
  const label = known ? STATUS_LABELS_ADMIN[status] : status;
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        padding: "3px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

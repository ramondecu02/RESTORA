import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadStats, listLeads } from "@/lib/leads";
import { ROLE_LABELS_ADMIN, STATUS_LABELS_ADMIN } from "@/lib/i18n";
import { isLeadRole, isLeadStatus, isLocale, LEAD_STATUSES } from "@/lib/types";
import { StatusBadge } from "@/components/admin/status-badge";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--muted)",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--hair)",
};
const td: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  borderBottom: "1px solid var(--hair)",
  verticalAlign: "top",
};

export default async function LeadsPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const sp = await props.searchParams;

  const cityFilter = first(sp.city)?.trim() || undefined;
  const statusRaw = first(sp.status);
  const statusFilter = statusRaw && isLeadStatus(statusRaw) ? statusRaw : undefined;
  const qFilter = first(sp.q)?.trim() || undefined;

  const [stats, leads] = await Promise.all([
    getLeadStats(),
    listLeads({ city: cityFilter, status: statusFilter, q: qFilter }),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale === "ca" ? "ca-ES" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const exportQuery = new URLSearchParams();
  if (cityFilter) exportQuery.set("city", cityFilter);
  if (statusFilter) exportQuery.set("status", statusFilter);
  if (qFilter) exportQuery.set("q", qFilter);
  const exportHref = `/api/leads/export.csv${exportQuery.toString() ? `?${exportQuery}` : ""}`;

  return (
    <main className="mx-auto max-w-[1120px]" style={{ padding: "36px 28px 80px" }}>
      {/* Stats */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 28 }}>
        <div>
          <div className="mono-label">Total de leads</div>
          <div className="mono" style={{ fontWeight: 600, fontSize: 40, lineHeight: 1 }}>
            {stats.total}
          </div>
        </div>
        <div>
          <div className="mono-label">Nuevos esta semana</div>
          <div className="mono" style={{ fontWeight: 600, fontSize: 40, lineHeight: 1, color: "var(--brand)" }}>
            {stats.newThisWeek}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <a href={exportHref} className="btn btn-outline" style={{ padding: "10px 18px", fontSize: 14 }}>
          Exportar CSV ↓
        </a>
      </div>

      {/* Filters */}
      <form
        method="get"
        className="card"
        style={{
          marginTop: 24,
          padding: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">Buscar (restaurante)</span>
          <input type="text" name="q" defaultValue={qFilter ?? ""} className="field-input" placeholder="Casa Pujol" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">Ciudad</span>
          <input type="text" name="city" defaultValue={cityFilter ?? ""} className="field-input" placeholder="Tarragona" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">Estado</span>
          <select name="status" defaultValue={statusFilter ?? ""} className="field-input">
            <option value="">Todos</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS_ADMIN[s]}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-brand" style={{ padding: "12px 18px", fontSize: 14, flex: 1 }}>
            Filtrar
          </button>
          <Link href={`/${locale}/admin/leads`} className="btn btn-outline" style={{ padding: "12px 16px", fontSize: 14 }}>
            Limpiar
          </Link>
        </div>
      </form>

      {/* Table */}
      <div className="card" style={{ marginTop: 16, overflowX: "auto" }}>
        {leads.length === 0 ? (
          <p style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 15 }}>
            No hay leads que coincidan con el filtro.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Alta</th>
                <th style={th}>Restaurante</th>
                <th style={th}>Rol</th>
                <th style={th}>Ciudad</th>
                <th style={th}>TPV actual</th>
                <th style={th}>Idioma</th>
                <th style={th}>Estado</th>
                <th style={th}>Origen</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ ...td, whiteSpace: "nowrap", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
                    {dateFmt.format(lead.createdAt)}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>
                    <Link
                      href={`/${locale}/admin/leads/${lead.id}`}
                      className="transition-colors hover:text-amber"
                      style={{ color: "var(--ink)" }}
                    >
                      {lead.restaurant}
                    </Link>
                  </td>
                  <td style={td}>{isLeadRole(lead.role) ? ROLE_LABELS_ADMIN[lead.role] : lead.role}</td>
                  <td style={td}>{lead.city}</td>
                  <td style={{ ...td, color: lead.pos ? "var(--ink)" : "var(--muted)" }}>{lead.pos ?? "—"}</td>
                  <td style={{ ...td, textTransform: "uppercase", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{lead.lang}</td>
                  <td style={td}>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td style={{ ...td, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{lead.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mono" style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
        {leads.length} resultado{leads.length === 1 ? "" : "s"} · ordenados por fecha (desc).
      </p>
    </main>
  );
}

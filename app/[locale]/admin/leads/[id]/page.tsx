import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads";
import { ROLE_LABELS_ADMIN, STATUS_LABELS_ADMIN } from "@/lib/i18n";
import { isLeadRole, isLocale, LEAD_STATUSES } from "@/lib/types";
import { StatusBadge } from "@/components/admin/status-badge";
import { updateLeadAction } from "../../actions";

export const dynamic = "force-dynamic";

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--hair)" }}>
      <span className="mono-label">{label}</span>
      <span style={{ fontSize: 14.5, textAlign: "right", fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</span>
    </div>
  );
}

export default async function LeadDetailPage(props: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale, id } = await props.params;
  if (!isLocale(locale)) notFound();
  const sp = await props.searchParams;

  const lead = await getLead(id);
  if (!lead) notFound();

  const dateFmt = new Intl.DateTimeFormat(locale === "ca" ? "ca-ES" : "es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto max-w-[880px]" style={{ padding: "36px 28px 80px" }}>
      <Link href={`/${locale}/admin/leads`} className="text-muted transition-colors hover:text-ink" style={{ fontSize: 14 }}>
        ← Volver a la lista
      </Link>

      {sp.saved && (
        <div
          role="status"
          style={{
            marginTop: 16,
            border: "1px solid var(--amber)",
            background: "var(--amber-soft)",
            color: "var(--ink)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 14,
          }}
        >
          ✓ Cambios guardados.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 20 }}>
        <h1 className="display" style={{ fontWeight: 800, fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1, margin: 0 }}>
          {lead.restaurant}
        </h1>
        <StatusBadge status={lead.status} />
      </div>
      <p className="mono" style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 8 }}>
        Alta: {dateFmt.format(lead.createdAt)}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 24, alignItems: "start" }}>
        {/* Read-only info */}
        <div className="card" style={{ padding: 24 }}>
          <div className="mono-label" style={{ marginBottom: 4 }}>Datos del lead</div>
          <InfoRow label="Rol" value={isLeadRole(lead.role) ? ROLE_LABELS_ADMIN[lead.role] : lead.role} />
          <InfoRow label="Ciudad" value={lead.city} />
          <InfoRow label="TPV actual" value={lead.pos ?? "—"} />
          <InfoRow label="Pregunta" value={lead.message ?? "—"} />
          <InfoRow label="Idioma web" value={lead.lang.toUpperCase()} mono />
          <InfoRow label="Origen" value={lead.source} mono />
          <InfoRow label="ID" value={lead.id} mono />
        </div>

        {/* Editable status + notes */}
        <form action={updateLeadAction} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <input type="hidden" name="id" value={lead.id} />
          <input type="hidden" name="locale" value={locale} />
          <div className="mono-label">Gestión</div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="field-label">Estado</span>
            <select name="status" defaultValue={lead.status} className="field-input">
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS_ADMIN[s]}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="field-label">Notas</span>
            <textarea
              name="notes"
              defaultValue={lead.notes ?? ""}
              rows={6}
              className="field-input"
              style={{ resize: "vertical", lineHeight: 1.5 }}
              placeholder="Notas internas del seguimiento…"
            />
          </label>

          <button type="submit" className="btn btn-amber" style={{ padding: 14, fontSize: 15 }}>
            Guardar cambios
          </button>
        </form>
      </div>
    </main>
  );
}

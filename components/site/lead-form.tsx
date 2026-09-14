"use client";

import { useState } from "react";
import type { SiteCopy } from "@/lib/site-copy";
import { LEAD_ROLES, type Locale } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

export function SiteLeadForm({ lead, locale }: { lead: SiteCopy["lead"]; locale: Locale }) {
  const roleOptions = LEAD_ROLES.map((value, i) => ({ value, label: lead.roles[i] }));

  const [restaurant, setRestaurant] = useState("");
  const [role, setRole] = useState<string>(LEAD_ROLES[0]);
  const [city, setCity] = useState("");
  const [pos, setPos] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<{ restaurant?: string; city?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: { restaurant?: string; city?: string } = {};
    if (!restaurant.trim()) next.restaurant = lead.errName;
    if (!city.trim()) next.city = lead.errCity;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant, role, city, pos, message, lang: locale, website }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="card" style={{ marginTop: 30, border: "1.5px solid var(--brand)", padding: 44, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--brand)", color: "var(--on-brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto" }}>✓</div>
        <div className="display" style={{ fontWeight: 700, fontSize: 26, marginTop: 14 }}>{lead.doneTitle}</div>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: "8px 0 0" }}>{lead.doneBody}</p>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <form onSubmit={handleSubmit} noValidate className="card" style={{ marginTop: 30, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{lead.fName}</span>
        <input type="text" className="field-input" placeholder={lead.fNamePh} value={restaurant} onChange={(e) => setRestaurant(e.target.value)} aria-invalid={errors.restaurant ? "true" : undefined} autoComplete="organization" />
        {errors.restaurant && <span role="alert" style={{ color: "var(--down)", fontSize: 12.5 }}>{errors.restaurant}</span>}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">{lead.fRole}</span>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">{lead.fCity}</span>
          <input type="text" className="field-input" placeholder={lead.fCityPh} value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={errors.city ? "true" : undefined} autoComplete="address-level2" />
          {errors.city && <span role="alert" style={{ color: "var(--down)", fontSize: 12.5 }}>{errors.city}</span>}
        </label>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{lead.fPos}</span>
        <input type="text" className="field-input" placeholder={lead.fPosPh} value={pos} onChange={(e) => setPos(e.target.value)} autoComplete="off" />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{lead.fMessage}</span>
        <textarea className="field-input" placeholder={lead.fMessagePh} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ resize: "vertical", lineHeight: 1.5 }} />
      </label>

      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>

      <button type="submit" className="btn btn-brand" style={{ marginTop: 6, padding: 15, fontSize: 16 }} disabled={loading}>
        {loading ? lead.sending : `${lead.submit} →`}
      </button>
      {status === "error" && <p role="alert" style={{ color: "var(--down)", fontSize: 13, textAlign: "center", margin: 0 }}>{lead.errGeneric}</p>}
      <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", margin: "2px 0 0" }}>{lead.note}</p>
    </form>
  );
}

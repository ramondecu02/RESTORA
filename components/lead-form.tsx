"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { LEAD_ROLES, type Locale } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const roleOptions = LEAD_ROLES.map((value, i) => ({ value, label: dict.lead.roles[i] }));

  const [restaurant, setRestaurant] = useState("");
  const [role, setRole] = useState<string>(LEAD_ROLES[0]);
  const [city, setCity] = useState("");
  const [pos, setPos] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — must stay empty
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<{ restaurant?: string; city?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { restaurant?: string; city?: string } = {};
    if (!restaurant.trim()) nextErrors.restaurant = dict.lead.errName;
    if (!city.trim()) nextErrors.city = dict.lead.errCity;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant, role, city, pos, message, lang: locale, website }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        style={{
          marginTop: 30,
          background: "var(--surface)",
          border: "1.5px solid var(--amber)",
          borderRadius: 18,
          padding: 44,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--amber)",
            color: "var(--on-amber)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto",
          }}
        >
          ✓
        </div>
        <div className="display" style={{ fontWeight: 800, fontSize: 28, marginTop: 14 }}>
          {dict.lead.doneTitle}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: "8px 0 0" }}>{dict.lead.doneBody}</p>
      </div>
    );
  }

  const loading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        marginTop: 30,
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 18,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{dict.lead.fName}</span>
        <input
          type="text"
          className="field-input"
          placeholder={dict.lead.fNamePh}
          value={restaurant}
          onChange={(e) => setRestaurant(e.target.value)}
          aria-invalid={errors.restaurant ? "true" : undefined}
          autoComplete="organization"
        />
        {errors.restaurant && (
          <span role="alert" style={{ color: "var(--amber)", fontSize: 12.5 }}>
            {errors.restaurant}
          </span>
        )}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">{dict.lead.fRole}</span>
          <select className="field-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="field-label">{dict.lead.fCity}</span>
          <input
            type="text"
            className="field-input"
            placeholder={dict.lead.fCityPh}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-invalid={errors.city ? "true" : undefined}
            autoComplete="address-level2"
          />
          {errors.city && (
            <span role="alert" style={{ color: "var(--amber)", fontSize: 12.5 }}>
              {errors.city}
            </span>
          )}
        </label>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{dict.lead.fPos}</span>
        <input
          type="text"
          className="field-input"
          placeholder={dict.lead.fPosPh}
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          autoComplete="off"
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="field-label">{dict.lead.fMessage}</span>
        <textarea
          className="field-input"
          placeholder={dict.lead.fMessagePh}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{ resize: "vertical", lineHeight: 1.5 }}
        />
      </label>

      {/* Honeypot: hidden from users, catches naive bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <button type="submit" className="btn btn-amber" style={{ marginTop: 6, padding: 16, fontSize: 16 }} disabled={loading}>
        {loading ? dict.lead.sending : `${dict.lead.submit} →`}
      </button>

      {status === "error" && (
        <p role="alert" style={{ color: "var(--amber)", fontSize: 13, textAlign: "center", margin: 0 }}>
          {dict.lead.errGeneric}
        </p>
      )}

      <p className="mono" style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", margin: "2px 0 0" }}>
        {dict.lead.note}
      </p>
    </form>
  );
}

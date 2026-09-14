"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { Eyebrow } from "./ui";

export function SiteFaq({ copy }: { copy: SiteCopy }) {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="mx-auto max-w-[820px]" style={{ padding: "80px 28px" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Eyebrow>{copy.faq.eyebrow}</Eyebrow>
        <h2 className="display" style={{ fontSize: "clamp(28px, 4vw, 42px)", margin: "16px 0 0" }}>{copy.faq.title}</h2>
        <p style={{ fontSize: 17, color: "var(--muted)", margin: "12px 0 0" }}>{copy.faq.sub}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 32 }}>
        {copy.faq.items.map((item, i) => {
          const isOpen = i === open;
          return (
            <div key={item.q} className="card" style={{ overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}
              >
                <span style={{ fontWeight: 600, fontSize: 16.5 }}>{item.q}</span>
                <span
                  aria-hidden="true"
                  style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s ease" }}
                >
                  <Plus size={15} strokeWidth={2.2} />
                </span>
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: "0 22px 20px", fontSize: 15, color: "var(--muted)", maxWidth: "64ch", lineHeight: 1.55 }}>{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

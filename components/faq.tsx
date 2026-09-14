"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";

export function Faq({ dict }: { dict: Dictionary }) {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="mx-auto max-w-[820px]" style={{ padding: "64px 28px" }}>
      <div className="masthead">
        <span className="masthead-kicker">◆ {dict.sec.faq}</span>
        <div className="masthead-rule" />
      </div>
      <h2
        className="display"
        style={{ fontWeight: 800, fontSize: "clamp(30px, 5vw, 50px)", lineHeight: 0.96, margin: "20px 0 0" }}
      >
        {dict.faq.title}
      </h2>
      <p style={{ fontSize: 17, color: "var(--muted)", margin: "12px 0 0" }}>{dict.faq.sub}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
        {dict.faq.items.map((item, i) => {
          const isOpen = i === open;
          return (
            <div key={item.q} className="card" style={{ overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "18px 22px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ink)",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 16.5 }}>{item.q}</span>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--amber)",
                    fontSize: 16,
                    transform: isOpen ? "rotate(45deg)" : "none",
                    transition: "transform .2s ease",
                  }}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <p
                  style={{
                    margin: 0,
                    padding: "0 22px 20px",
                    fontSize: 15,
                    color: "var(--muted)",
                    maxWidth: "62ch",
                  }}
                >
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

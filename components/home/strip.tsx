import { Boxes, ShoppingCart, Sparkles, TrendingUp, UtensilsCrossed } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";

const ICONS = [ShoppingCart, UtensilsCrossed, TrendingUp, Boxes, Sparkles];

// Quiet capability rail directly under the hero — sets the scope in one glance.
export function HomeStrip({ copy }: { copy: SiteCopy }) {
  return (
    <section style={{ background: "var(--surface)", borderBottom: "1px solid var(--hair)" }}>
      <div
        className="reveal-group mx-auto max-w-[1280px]"
        style={{
          padding: "clamp(22px, 3vw, 38px) 28px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(188px, 1fr))",
        }}
      >
        {copy.home.capabilities.map((c, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <div key={c.title} className="strip-item" style={{ padding: "16px clamp(14px, 1.8vw, 26px)" }}>
              <Icon size={19} strokeWidth={1.5} color="var(--brand)" />
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 12, letterSpacing: "-0.01em" }}>{c.title}</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{c.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

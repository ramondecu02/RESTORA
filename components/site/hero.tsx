import Link from "next/link";
import { Coins, ShoppingBag, TrendingUp, Truck, Workflow } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { DashboardMock } from "./dashboard-mock";
import { Photo } from "./photo";
import { Eyebrow } from "./ui";

const CHIP_ICONS = [ShoppingBag, Truck, Coins, TrendingUp, Workflow];

export function SiteHero({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      {/* soft brand glow behind the dashboard */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 620,
          height: 620,
          background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 16%, transparent), transparent 68%)",
          pointerEvents: "none",
        }}
      />
      <div
        className="mx-auto max-w-[1200px]"
        style={{
          padding: "72px 28px 40px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
          gap: 48,
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left */}
        <div>
          <Eyebrow>{copy.hero.eyebrow}</Eyebrow>
          <h1
            className="display"
            style={{ fontSize: "clamp(40px, 6.4vw, 68px)", margin: "18px 0 0", maxWidth: "13ch", textWrap: "balance" }}
          >
            {copy.hero.title}
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "var(--muted)", margin: "22px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>
            {copy.hero.sub}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            <Link href={`/${locale}/contacto`} className="btn btn-brand" style={{ padding: "14px 24px", fontSize: 15.5 }}>
              {copy.hero.ctaPrimary} →
            </Link>
            <Link href={`/${locale}/como-funciona`} className="btn btn-outline" style={{ padding: "14px 24px", fontSize: 15.5 }}>
              {copy.hero.ctaSecondary}
            </Link>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "22px 30px", marginTop: 38 }}>
            {copy.hero.chips.map((chip, i) => {
              const Icon = CHIP_ICONS[i % CHIP_ICONS.length];
              return (
                <div key={chip} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <Icon size={20} strokeWidth={1.6} color="var(--brand)" />
                  <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>{chip}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — product dashboard + chef accent (fusion of producto + cocina) */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <DashboardMock />
          <div
            className="float-y hidden md:block"
            style={{ position: "absolute", left: -6, bottom: -30, width: 188, zIndex: 2 }}
          >
            <Photo
              src="/images/chef-plating.webp"
              alt="Chef emplatando"
              radius={16}
              focal="center"
              style={{ width: "100%", aspectRatio: "4 / 3", boxShadow: "0 30px 60px -34px rgba(20,32,26,0.6)", border: "3px solid var(--surface)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

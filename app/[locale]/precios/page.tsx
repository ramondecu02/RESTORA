import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Tag } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getPrecios } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { PageHead } from "@/components/pages/page-head";
import { SecureLine, TrustBadges } from "@/components/site/trust-badges";
import { APP_SIGNUP_URL } from "@/lib/site";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getPrecios(isLocale(locale) ? locale : "es");
  return pageMetadata(isLocale(locale) ? locale : "es", "precios", `${c.hero.eyebrow} · RESTORA`, c.hero.sub);
}

export default async function PreciosPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const p = copy.pricing;
  const c = getPrecios(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} note={p.previewNote} />

        {/* Free trial and the three plans (prices without VAT, set by the owner on 8/10/2026) */}
        <section style={{ padding: "clamp(44px, 5.5vw, 76px) 28px" }}>
          <div
            className="reveal-group mx-auto grid max-w-[1080px]"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(296px, 1fr))", gap: 18, alignItems: "stretch" }}
          >
            <div className="card hover-lift" style={{ padding: "clamp(26px, 3vw, 38px)", display: "flex", flexDirection: "column" }}>
              <div className="editorial-eyebrow" style={{ color: "var(--muted)" }}>{p.trialLabel}</div>
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 10px", marginTop: 10 }}>
                <span className="display-serif" style={{ fontSize: "clamp(52px, 6vw, 72px)", letterSpacing: "-0.02em" }}>{p.trialValue}</span>
                <span style={{ fontSize: 17, color: "var(--muted)" }}>{p.trialNote}</span>
              </div>
              <div className="hairline" style={{ margin: "24px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {p.includes.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15 }}>
                    <Check size={18} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <a href={APP_SIGNUP_URL} className="btn btn-outline" style={{ marginTop: 28, padding: 14, fontSize: 15.5, justifyContent: "center" }}>
                {p.cta}
              </a>
            </div>

          </div>
        </section>

        <section style={{ padding: "0 28px clamp(44px, 5.5vw, 76px)" }}>
          <div className="mx-auto max-w-[1080px]">
            <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--brand)" }}>
                <Tag size={14} strokeWidth={2} />
                {p.plansBadge}
              </div>
              <h2 className="display-serif" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", margin: 0 }}>{p.plansTitle}</h2>
              <p style={{ fontSize: 16, color: "var(--muted)", margin: 0, maxWidth: "60ch", lineHeight: 1.6 }}>{p.plansBody}</p>
            </div>
            <div className="reveal-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(262px, 1fr))", gap: 18, alignItems: "stretch" }}>
              {p.plans.map((pl) => (
                <div key={pl.name} className="card hover-lift" style={{ padding: "clamp(24px, 2.6vw, 34px)", display: "flex", flexDirection: "column" }}>
                  <div className="display-serif" style={{ fontSize: 26 }}>{pl.name}</div>
                  <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "6px 0 0" }}>{pl.tagline}</p>
                  <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 8px", marginTop: 18 }}>
                    <span className="display-serif" style={{ fontSize: "clamp(40px, 4.4vw, 52px)", letterSpacing: "-0.02em" }}>{pl.price}</span>
                    <span style={{ fontSize: 15, color: "var(--muted)" }}>{p.perMonth} {p.vatNote}</span>
                  </div>
                  <div className="hairline" style={{ margin: "20px 0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
                    {pl.perks.map((f) => (
                      <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15 }}>
                        <Check size={18} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{f}</span>
                      </div>
                    ))}
                    {pl.soon.map((f) => (
                      <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, color: "var(--muted)" }}>
                        <span aria-hidden="true" style={{ width: 18, flexShrink: 0, textAlign: "center", marginTop: 1 }}>·</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href={APP_SIGNUP_URL} className="btn btn-outline" style={{ marginTop: 26, padding: 14, fontSize: 15.5, justifyContent: "center" }}>{copy.pricing.cta}</a>
                </div>
              ))}
            </div>
            <p className="reveal" style={{ fontSize: 15, color: "var(--muted)", margin: "22px 0 0", maxWidth: "62ch" }}>
              {p.plansNote}{" "}
              <Link href={`/${locale}/contacto`} style={{ color: "var(--brand)", fontWeight: 600 }}>{p.plansCta} →</Link>
            </p>
          </div>
        </section>

        <div className="reveal mx-auto max-w-[1080px]" style={{ padding: "0 28px clamp(40px, 5vw, 64px)", display: "flex", flexDirection: "column", gap: 14 }}>
          <SecureLine trust={copy.trust} />
          <TrustBadges trust={copy.trust} />
        </div>

        {/* What's included */}
        <section style={{ background: "var(--surface)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)", padding: "clamp(52px, 6.5vw, 92px) 28px" }}>
          <div className="mx-auto max-w-[1280px]">
            <h2 className="display-serif reveal" style={{ fontSize: "clamp(26px, 3.2vw, 38px)", margin: 0, maxWidth: "20ch" }}>{c.includedTitle}</h2>
            <div className="reveal-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "clamp(20px, 3vw, 44px)", marginTop: "clamp(26px, 3.5vw, 44px)" }}>
              {c.includedGroups.map((g) => (
                <div key={g.title} style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>{g.title}</div>
                  <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                    {g.items.map((it) => (
                      <li key={it} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, color: "var(--muted)" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", marginTop: 8, flexShrink: 0 }} />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it fits */}
        <section style={{ padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <div className="mx-auto max-w-[1280px]">
            <div className="reveal">
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.fit.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", margin: "16px 0 0", maxWidth: "18ch" }}>{c.fit.title}</h2>
              <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: "52ch", lineHeight: 1.65 }}>{c.fit.sub}</p>
            </div>
            <div className="reveal-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(262px, 1fr))", gap: 16, marginTop: "clamp(28px, 3.5vw, 44px)" }}>
              {c.fit.profiles.map((pr) => (
                <div key={pr.name} className="card hover-lift" style={{ padding: 26, display: "flex", flexDirection: "column" }}>
                  <div className="display-serif" style={{ fontSize: 23 }}>{pr.name}</div>
                  <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.55 }}>{pr.desc}</p>
                  <div className="hairline" style={{ margin: "18px 0" }} />
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {pr.signals.map((s) => (
                      <li key={s} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14 }}>
                        <Check size={16} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="reveal" style={{ fontSize: 15, color: "var(--muted)", margin: "26px 0 0", maxWidth: "58ch", fontStyle: "italic" }}>{c.fit.note}</p>
          </div>
        </section>

        {/* Price objections */}
        <section style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", padding: "clamp(52px, 6.5vw, 92px) 28px" }}>
          <div className="mx-auto grid max-w-[1080px] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" style={{ gap: "clamp(24px, 4vw, 60px)" }}>
            <div className="reveal" style={{ minWidth: 0 }}>
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.objections.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(25px, 3vw, 36px)", margin: "16px 0 0", maxWidth: "15ch" }}>{c.objections.title}</h2>
              <Link href={`/${locale}/preguntas`} className="btn btn-outline" style={{ marginTop: 24, padding: "12px 20px", fontSize: 14.5 }}>
                {c.objections.linkLabel}
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
            <div className="reveal-group" style={{ minWidth: 0 }}>
              {c.objections.items.map((it) => (
                <div key={it.q} style={{ borderBottom: "1px solid var(--line)", padding: "18px 0" }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{it.q}</div>
                  <p style={{ fontSize: 15, color: "var(--muted)", margin: "8px 0 0", lineHeight: 1.6, maxWidth: "58ch" }}>{it.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

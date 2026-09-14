import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getPrecios } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { PageHead } from "@/components/pages/page-head";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getPrecios(isLocale(locale) ? locale : "es");
  return { title: `${c.hero.eyebrow} · RESTORA`, description: c.hero.sub };
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

        {/* Price + founder offer */}
        <section style={{ padding: "clamp(44px, 5.5vw, 76px) 28px" }}>
          <div
            className="reveal-group mx-auto grid max-w-[1080px]"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(296px, 1fr))", gap: 18, alignItems: "stretch" }}
          >
            <div className="card hover-lift" style={{ padding: "clamp(26px, 3vw, 38px)", display: "flex", flexDirection: "column" }}>
              <div className="editorial-eyebrow" style={{ color: "var(--muted)" }}>{p.fromLabel}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
                <span className="display-serif" style={{ fontSize: "clamp(52px, 6vw, 72px)", letterSpacing: "-0.02em" }}>{p.price}</span>
                <span style={{ fontSize: 17, color: "var(--muted)" }}>{p.period}</span>
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
              <Link href={`/${locale}/contacto`} className="btn btn-outline" style={{ marginTop: 28, padding: 14, fontSize: 15.5, justifyContent: "center" }}>
                {p.cta}
              </Link>
            </div>

            <div
              className="hover-lift"
              style={{ position: "relative", overflow: "hidden", background: "var(--brand)", color: "var(--on-brand)", border: "1px solid var(--brand)", borderRadius: 20, padding: "clamp(26px, 3vw, 38px)", display: "flex", flexDirection: "column", boxShadow: "0 40px 84px -46px rgba(30,61,47,0.5)" }}
            >
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 600 }}>
                <Sparkles size={14} strokeWidth={2} />
                {p.founderBadge}
              </div>
              <h2 className="display-serif" style={{ position: "relative", fontSize: "clamp(26px, 3vw, 34px)", marginTop: 18, color: "#fff" }}>{p.founderTitle}</h2>
              <p style={{ position: "relative", fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "12px 0 0", lineHeight: 1.6 }}>{p.founderBody}</p>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12, marginTop: 22, flex: 1 }}>
                {p.founderPerks.map((perk) => (
                  <div key={perk} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15 }}>
                    <Check size={18} strokeWidth={2.6} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
              <Link href={`/${locale}/contacto`} className="btn" style={{ position: "relative", marginTop: 28, padding: 14, fontSize: 15.5, justifyContent: "center", background: "#fff", color: "var(--brand)", border: "1px solid #fff" }}>
                {p.cta} →
              </Link>
            </div>
          </div>
        </section>

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

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getComoFunciona } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CtaBand } from "@/components/site/cta-band";
import { PageHead } from "@/components/pages/page-head";
import { Frame } from "@/components/home/frame";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getComoFunciona(isLocale(locale) ? locale : "es");
  return pageMetadata(isLocale(locale) ? locale : "es", "como-funciona", `${c.hero.eyebrow} · RESTORA`, c.hero.sub);
}

export default async function ComoFuncionaPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const c = getComoFunciona(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} note={c.caseTag} />

        {/* The story, stage by stage */}
        <section style={{ padding: "clamp(44px, 5.5vw, 78px) 28px clamp(20px, 3vw, 36px)" }}>
          <div className="mx-auto max-w-[1080px]">
            {c.stages.map((s, i) => (
              <div
                key={s.num}
                className="reveal grid md:grid-cols-[auto_minmax(0,1fr)]"
                style={{ gap: "clamp(18px, 3vw, 38px)", paddingBottom: i === c.stages.length - 1 ? 0 : "clamp(36px, 4.5vw, 62px)" }}
              >
                {/* rail */}
                <div className="hidden md:flex" style={{ flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <span
                    className="mono"
                    style={{ width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", background: "var(--surface)", fontWeight: 700, fontSize: 13.5, color: "var(--brand)" }}
                  >
                    {s.num}
                  </span>
                  {i < c.stages.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--line)" }} />}
                </div>

                <div style={{ minWidth: 0, paddingBottom: 4 }}>
                  <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>
                    <span className="md:hidden">{s.num} · </span>
                    {s.step}
                  </div>
                  <h2 className="display-serif" style={{ fontSize: "clamp(26px, 3.2vw, 40px)", margin: "14px 0 0", maxWidth: "18ch" }}>
                    {s.title}
                  </h2>
                  <p style={{ fontSize: 16.5, color: "var(--muted)", margin: "14px 0 0", lineHeight: 1.65, maxWidth: "52ch" }}>{s.body}</p>

                  {/* the running example */}
                  <div
                    className="card"
                    style={{ marginTop: 22, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                      {s.moment}
                    </span>
                    <p className="display-serif" style={{ margin: 0, fontSize: "clamp(18px, 2.1vw, 22px)", lineHeight: 1.35 }}>{s.example}</p>
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 600 }}>{s.tag}</span>
                  </div>

                  {"options" in s && s.options && (
                    <div
                      className="reveal-group"
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(178px, 1fr))", gap: 12, marginTop: 16, maxWidth: 620 }}
                    >
                      {s.options.map((o) => (
                        <div key={o.label} className="card hover-lift" style={{ padding: 16 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.label}</div>
                          <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{o.effect}</div>
                          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>{o.note}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* First week */}
        <section style={{ background: "var(--surface)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)", padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <div className="mx-auto max-w-[1280px]">
            <div className="reveal">
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.week.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(28px, 3.6vw, 44px)", margin: "16px 0 0", maxWidth: "18ch" }}>{c.week.title}</h2>
              <p style={{ fontSize: 17, color: "var(--muted)", margin: "14px 0 0", maxWidth: "48ch", lineHeight: 1.6 }}>{c.week.sub}</p>
            </div>
            <div
              className="reveal-group"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))", gap: "clamp(18px, 2.6vw, 34px)", marginTop: "clamp(30px, 4vw, 48px)" }}
            >
              {c.week.steps.map((s) => (
                <div key={s.day} style={{ borderTop: "2px solid var(--brand)", paddingTop: 18 }}>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand)" }}>{s.day}</div>
                  <div className="display-serif" style={{ fontSize: 22, margin: "12px 0 0" }}>{s.title}</div>
                  <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you don't have to do — over the open-kitchen photo */}
        <section style={{ padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <Frame
            src="/images/cocina-abierta.webp"
            alt="Cocina abierta de restaurante en servicio"
            sizes="(max-width: 1336px) 100vw, 1280px"
            focal="focal-operativa"
            kenburns
            radius={28}
            className="reveal mx-auto max-w-[1280px]"
            style={{ minHeight: "clamp(400px, 46vw, 520px)", display: "flex", alignItems: "flex-end" }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,13,10,0.24) 0%, rgba(8,13,10,0.55) 42%, rgba(8,13,10,0.9) 100%)" }} />
            <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 3, width: "100%", padding: "clamp(26px, 4vw, 54px)" }}>
              <div className="editorial-eyebrow" style={{ color: "rgba(255,255,255,0.62)" }}>{c.reassure.eyebrow}</div>
              <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(27px, 3.6vw, 44px)", margin: "14px 0 0", maxWidth: "20ch" }}>
                {c.reassure.title}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "clamp(16px, 2.4vw, 32px)", marginTop: "clamp(24px, 3vw, 36px)", paddingTop: "clamp(18px, 2.4vw, 26px)", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                {c.reassure.items.map((it) => (
                  <div key={it.title} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <Check size={17} strokeWidth={2.6} color="#8fd3b0" style={{ flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{it.title}</div>
                      <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13.5, margin: "5px 0 0", lineHeight: 1.55 }}>{it.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Frame>
        </section>

        <CtaBand copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

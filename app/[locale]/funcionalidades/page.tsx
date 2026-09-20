import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getFuncionalidades } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { CtaBand } from "@/components/site/cta-band";
import { ShareBand } from "@/components/site/share-band";
import { PageHead } from "@/components/pages/page-head";
import { ModuleDemo } from "@/components/mock/demos";
import { Frame } from "@/components/home/frame";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getFuncionalidades(isLocale(locale) ? locale : "es");
  return pageMetadata(isLocale(locale) ? locale : "es", "funcionalidades", `${c.hero.eyebrow} · RESTORA`, c.hero.sub);
}

export default async function FuncionalidadesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const c = getFuncionalidades(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} note={c.hero.note} />

        {c.modules.map((m, i) => {
          const reverse = i % 2 === 1;
          const tone = i % 2 === 1 ? "var(--surface)" : "var(--bg)";
          return (
            <section
              key={m.key}
              id={m.key}
              style={{
                background: tone,
                padding: "clamp(52px, 6.5vw, 96px) 28px",
                borderTop: i % 2 === 1 ? "1px solid var(--hair)" : undefined,
                borderBottom: i % 2 === 1 ? "1px solid var(--hair)" : undefined,
              }}
            >
              <div
                className="mx-auto grid max-w-[1280px] items-center md:grid-cols-2"
                style={{ gap: "clamp(32px, 4.5vw, 72px)" }}
              >
                <div className={`reveal ${reverse ? "md:order-2" : ""}`} style={{ minWidth: 0 }}>
                  <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>
                    {m.eyebrow}
                  </div>
                  <h2 className="display-serif" style={{ fontSize: "clamp(27px, 3.4vw, 42px)", margin: "16px 0 0", maxWidth: "17ch" }}>
                    {m.title}
                  </h2>
                  <p style={{ fontSize: 16.5, color: "var(--muted)", margin: "16px 0 0", lineHeight: 1.65, maxWidth: "44ch" }}>{m.body}</p>
                  <ul style={{ listStyle: "none", margin: "22px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {m.points.map((p) => (
                      <li key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5 }}>
                        <Check size={17} strokeWidth={2.4} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`reveal ${reverse ? "md:order-1" : ""}`} style={{ minWidth: 0 }}>
                  <ModuleDemo demo={m.demo} chrome={c.chrome} />
                </div>
              </div>
            </section>
          );
        })}

        {/* Everything is one chain */}
        <section style={{ padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <Frame
            src="/images/chef-funcionalidades.webp"
            alt="Chef trabajando en cocina profesional"
            sizes="(max-width: 1336px) 100vw, 1280px"
            focal="focal-chef"
            kenburns
            radius={28}
            className="reveal mx-auto max-w-[1280px]"
            style={{ minHeight: "clamp(360px, 42vw, 480px)", display: "flex", alignItems: "flex-end" }}
          >
            <div
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,13,10,0.25) 0%, rgba(8,13,10,0.55) 45%, rgba(8,13,10,0.88) 100%)" }}
            />
            <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 3, width: "100%", padding: "clamp(26px, 4vw, 54px)" }}>
              <div className="editorial-eyebrow" style={{ color: "rgba(255,255,255,0.62)" }}>{c.closing.eyebrow}</div>
              <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(27px, 3.7vw, 46px)", margin: "14px 0 0", maxWidth: "20ch" }}>
                {c.closing.title}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 16.5, margin: "14px 0 0", maxWidth: "52ch", lineHeight: 1.65 }}>{c.closing.sub}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 26, flexWrap: "wrap" }}>
                {c.closing.chain.map((step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.26)", borderRadius: 999, padding: "8px 15px" }}
                    >
                      {step}
                    </span>
                    {i < c.closing.chain.length - 1 && <ArrowRight size={15} strokeWidth={2} color="rgba(255,255,255,0.45)" />}
                  </div>
                ))}
              </div>
              <Link
                href={`/${locale}/como-funciona`}
                className="btn"
                style={{ marginTop: 28, padding: "13px 24px", fontSize: 15, background: "#fff", color: "#12211a", border: "1px solid #fff" }}
              >
                {copy.hero.ctaSecondary}
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </Frame>
        </section>

        <ShareBand copy={copy} />
        <CtaBand copy={copy} locale={locale} />
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

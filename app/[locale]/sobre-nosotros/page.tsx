import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ImageOff, Mail } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getSobre } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { PageHead } from "@/components/pages/page-head";
import { Frame } from "@/components/home/frame";
import { TrustBadges } from "@/components/site/trust-badges";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const typed = isLocale(locale) ? locale : "es";
  const c = getSobre(typed);
  return pageMetadata(typed, "sobre-nosotros", `${c.hero.eyebrow} · RESTORA`, c.hero.sub);
}

export default async function SobreNosotrosPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const c = getSobre(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

        {/* Who is behind it — real photo and bio still pending, never invented */}
        <section style={{ padding: "clamp(44px, 5.5vw, 78px) 28px" }}>
          <div className="mx-auto grid max-w-[1180px] items-start lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]" style={{ gap: "clamp(24px, 4vw, 60px)" }}>
            <div className="reveal" style={{ minWidth: 0 }}>
              {/* TODO(Ramon): sustituir por <Frame src="/images/ramon.webp" …> cuando exista la foto. */}
              <div
                role="img"
                aria-label={c.who.photoPlaceholder}
                style={{
                  aspectRatio: "4 / 5",
                  borderRadius: 22,
                  border: "1px dashed color-mix(in srgb, var(--earth) 55%, var(--hair))",
                  background: "color-mix(in srgb, var(--earth) 10%, var(--surface))",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: 24,
                  textAlign: "center",
                  color: "var(--muted)",
                }}
              >
                <ImageOff size={26} strokeWidth={1.6} color="var(--earth)" />
                <span className="mono" style={{ fontSize: 13, lineHeight: 1.5, maxWidth: "28ch" }}>{c.who.photoPlaceholder}</span>
              </div>
            </div>

            <div className="reveal" style={{ minWidth: 0 }}>
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.who.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(30px, 4vw, 50px)", margin: "16px 0 0" }}>{c.who.name}</h2>
              <p className="mono" style={{ fontSize: 13.5, color: "var(--earth)", margin: "10px 0 0", fontWeight: 600 }}>{c.who.role}</p>
              <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                {c.who.bio.map((p) => (
                  <p
                    key={p}
                    style={{
                      fontSize: 16,
                      lineHeight: 1.7,
                      margin: 0,
                      padding: "14px 16px",
                      borderRadius: 14,
                      color: "var(--muted)",
                      background: "color-mix(in srgb, var(--earth) 10%, var(--surface))",
                      border: "1px dashed color-mix(in srgb, var(--earth) 55%, var(--hair))",
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>
              <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 18px" }}>
                <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline" style={{ padding: "12px 20px", fontSize: 14.5 }}>
                  <Mail size={16} strokeWidth={1.9} />
                  {c.who.contactLabel}
                </a>
                <span style={{ fontSize: 13.5, color: "var(--muted)" }}>{c.who.contactNote}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Why RESTORA exists */}
        <section style={{ background: "var(--surface)", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)", padding: "clamp(52px, 6.5vw, 92px) 28px" }}>
          <div className="mx-auto grid max-w-[1180px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" style={{ gap: "clamp(24px, 4vw, 64px)" }}>
            <div className="reveal" style={{ minWidth: 0 }}>
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.why.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(27px, 3.4vw, 42px)", margin: "16px 0 0", maxWidth: "18ch" }}>{c.why.title}</h2>
            </div>
            <div className="reveal" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
              {c.why.body.map((p) => (
                <p key={p} style={{ fontSize: 17, color: "var(--muted)", margin: 0, lineHeight: 1.7, maxWidth: "58ch" }}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* The thesis, over a real kitchen */}
        <section style={{ padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <Frame
            src="/images/cocina-abierta.webp"
            alt="Cocina abierta de restaurante en servicio"
            sizes="(max-width: 1236px) 100vw, 1180px"
            focal="focal-operativa"
            kenburns
            radius={28}
            className="reveal mx-auto max-w-[1180px]"
            style={{ minHeight: "clamp(380px, 44vw, 520px)", display: "flex", alignItems: "flex-end" }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,13,10,0.3) 0%, rgba(8,13,10,0.6) 45%, rgba(8,13,10,0.9) 100%)" }} />
            <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 3, width: "100%", padding: "clamp(26px, 4vw, 54px)" }}>
              <div className="editorial-eyebrow" style={{ color: "rgba(255,255,255,0.62)" }}>{c.thesis.eyebrow}</div>
              <blockquote className="display-serif" style={{ color: "#fff", fontSize: "clamp(28px, 3.8vw, 48px)", margin: "14px 0 0", maxWidth: "18ch" }}>
                «{c.thesis.quote}»
              </blockquote>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16.5, margin: "16px 0 0", maxWidth: "56ch", lineHeight: 1.65 }}>{c.thesis.body}</p>
            </div>
          </Frame>

          <div className="reveal-group mx-auto max-w-[1180px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "clamp(18px, 2.6vw, 34px)", marginTop: "clamp(28px, 3.5vw, 44px)" }}>
            {c.thesis.principles.map((p, i) => (
              <div key={p.title} style={{ borderTop: "2px solid var(--brand)", paddingTop: 18 }}>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.08em" }}>{String(i + 1).padStart(2, "0")}</span>
                <div className="display-serif" style={{ fontSize: 23, margin: "10px 0 0" }}>{p.title}</div>
                <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Where — and the door in */}
        <section style={{ background: "var(--panel)", borderTop: "1px solid var(--hair)", padding: "clamp(52px, 6.5vw, 92px) 28px" }}>
          <div className="mx-auto grid max-w-[1180px] items-center lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" style={{ gap: "clamp(24px, 4vw, 60px)" }}>
            <div className="reveal" style={{ minWidth: 0 }}>
              <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{c.where.eyebrow}</div>
              <h2 className="display-serif" style={{ fontSize: "clamp(27px, 3.4vw, 42px)", margin: "16px 0 0", maxWidth: "18ch" }}>{c.where.title}</h2>
              <p style={{ fontSize: 16.5, color: "var(--muted)", margin: "16px 0 0", lineHeight: 1.65, maxWidth: "54ch" }}>{c.where.body}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
                <Link href={`/${locale}/contacto`} className="btn btn-brand" style={{ padding: "13px 22px", fontSize: 15 }}>
                  {c.where.cta}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
                <Link href={`/${locale}/como-funciona`} className="btn btn-outline" style={{ padding: "13px 22px", fontSize: 15 }}>
                  {c.where.secondary}
                </Link>
              </div>
            </div>
            <div className="reveal" style={{ minWidth: 0 }}>
              <TrustBadges trust={copy.trust} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

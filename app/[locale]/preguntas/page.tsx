import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getPreguntas } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { PageHead } from "@/components/pages/page-head";
import { Frame } from "@/components/home/frame";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getPreguntas(isLocale(locale) ? locale : "es");
  return { title: `${c.hero.eyebrow} · RESTORA`, description: c.hero.sub };
}

export default async function PreguntasPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const c = getPreguntas(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

        {c.groups.map((g, gi) => (
          <section
            key={g.title}
            style={{
              background: gi % 2 === 1 ? "var(--surface)" : "var(--bg)",
              borderTop: gi % 2 === 1 ? "1px solid var(--hair)" : undefined,
              borderBottom: gi % 2 === 1 ? "1px solid var(--hair)" : undefined,
              padding: "clamp(40px, 5vw, 72px) 28px",
            }}
          >
            <div
              className="mx-auto grid max-w-[1180px] lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]"
              style={{ gap: "clamp(20px, 3.5vw, 60px)" }}
            >
              <div className="reveal" style={{ minWidth: 0 }}>
                <h2 className="display-serif lg:sticky" style={{ fontSize: "clamp(24px, 2.9vw, 34px)", margin: 0, top: 104, maxWidth: "12ch" }}>
                  {g.title}
                </h2>
              </div>
              <div className="reveal-group" style={{ minWidth: 0 }}>
                {g.items.map((it, i) => (
                  <div key={it.q} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)", padding: i === 0 ? "0 0 20px" : "20px 0" }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{it.q}</h3>
                    <p style={{ fontSize: 15.5, color: "var(--muted)", margin: "9px 0 0", lineHeight: 1.65, maxWidth: "62ch" }}>{it.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Still unsure → contact */}
        <section style={{ padding: "clamp(56px, 7vw, 100px) 28px" }}>
          <Frame
            src="/images/sala.webp"
            alt="Sala de restaurante"
            sizes="(max-width: 1136px) 100vw, 1080px"
            focal="focal-sala"
            kenburns
            radius={28}
            className="reveal mx-auto max-w-[1080px]"
            style={{ minHeight: "clamp(320px, 36vw, 420px)", display: "flex", alignItems: "center" }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(180deg, rgba(8,13,10,0.55) 0%, rgba(8,13,10,0.78) 100%)" }} />
            <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0, zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 3, width: "100%", padding: "clamp(28px, 4vw, 54px)", textAlign: "center" }}>
              <h2 className="display-serif" style={{ color: "#fff", fontSize: "clamp(27px, 3.5vw, 42px)", margin: 0 }}>{c.still.title}</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16.5, margin: "14px auto 0", maxWidth: "44ch", lineHeight: 1.6 }}>{c.still.sub}</p>
              <Link href={`/${locale}/contacto`} className="btn" style={{ marginTop: 26, padding: "14px 26px", fontSize: 15.5, background: "#fff", color: "#12211a", border: "1px solid #fff" }}>
                {c.still.cta}
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </Frame>
        </section>
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

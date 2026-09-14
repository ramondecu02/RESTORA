import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { getContacto } from "@/lib/pages-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { SiteLeadForm } from "@/components/site/lead-form";
import { PageHead } from "@/components/pages/page-head";
import { Frame } from "@/components/home/frame";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const c = getContacto(isLocale(locale) ? locale : "es");
  return { title: `${c.hero.title} · RESTORA`, description: c.hero.sub };
}

export default async function ContactoPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const c = getContacto(locale);

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <PageHead eyebrow={c.hero.eyebrow} title={c.hero.title} sub={c.hero.sub} />

        <section style={{ padding: "clamp(40px, 5vw, 72px) 28px clamp(56px, 7vw, 96px)" }}>
          <div className="mx-auto grid max-w-[1180px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]" style={{ gap: "clamp(30px, 4.5vw, 64px)" }}>
            {/* Left: email, steps, photo */}
            <div style={{ minWidth: 0 }}>
              <a
                href={`mailto:${c.email}`}
                className="card hover-lift reveal"
                style={{ display: "flex", gap: 16, alignItems: "center", padding: "22px 24px", color: "var(--ink)" }}
              >
                <span className="icon-badge" style={{ width: 46, height: 46 }}>
                  <Mail size={20} strokeWidth={1.8} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                    {c.emailLabel}
                  </span>
                  <span className="display-serif" style={{ display: "block", fontSize: "clamp(20px, 2.4vw, 28px)", marginTop: 6, color: "var(--brand)", wordBreak: "break-word" }}>
                    {c.email}
                  </span>
                </span>
              </a>
              <p className="reveal" style={{ fontSize: 14.5, color: "var(--muted)", margin: "14px 0 0" }}>{c.emailNote}</p>

              <div className="reveal" style={{ marginTop: "clamp(30px, 4vw, 46px)" }}>
                <h2 className="display-serif" style={{ fontSize: "clamp(22px, 2.6vw, 30px)", margin: 0 }}>{c.next.title}</h2>
                <div className="reveal-group" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 2 }}>
                  {c.next.steps.map((s) => (
                    <div key={s.num} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 0", borderTop: "1px solid var(--line)" }}>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", paddingTop: 3, letterSpacing: "0.08em" }}>{s.num}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15.5 }}>{s.title}</div>
                        <p style={{ fontSize: 14.5, color: "var(--muted)", margin: "5px 0 0", lineHeight: 1.6, maxWidth: "46ch" }}>{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Frame
                src="/images/sala-contacto.webp"
                alt="Interior de un restaurante"
                sizes="(max-width: 1024px) 100vw, 46vw"
                focal="focal-sala"
                ratio="16 / 10"
                radius={22}
                zoom
                grain
                className="reveal"
                style={{ marginTop: "clamp(26px, 3.5vw, 40px)", border: "1px solid var(--hair)" }}
              />
              <p className="reveal" style={{ fontSize: 13.5, color: "var(--muted)", margin: "14px 0 0", fontStyle: "italic", maxWidth: "50ch" }}>
                {c.founderNote}
              </p>
            </div>

            {/* Right: the form */}
            <div style={{ minWidth: 0 }}>
              <div id="formulario" className="lg:sticky" style={{ top: 100 }}>
                <h2 className="display-serif" style={{ fontSize: "clamp(22px, 2.6vw, 30px)", margin: 0 }}>{c.formTitle}</h2>
                <p style={{ fontSize: 15, color: "var(--muted)", margin: "10px 0 0", maxWidth: "44ch", lineHeight: 1.6 }}>{c.formSub}</p>
                <SiteLeadForm lead={copy.lead} locale={locale} />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

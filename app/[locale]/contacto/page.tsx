import { notFound } from "next/navigation";
import { Clock, ShieldCheck, Users } from "lucide-react";
import { getSiteCopy } from "@/lib/site-copy";
import { isLocale } from "@/lib/types";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { Photo } from "@/components/site/photo";
import { Eyebrow } from "@/components/site/ui";
import { SiteLeadForm } from "@/components/site/lead-form";

export default async function ContactoPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const copy = getSiteCopy(locale);
  const p = copy.pages.contacto;

  const trust = [
    { icon: Clock, label: copy.lead.note },
    { icon: Users, label: copy.lead.eyebrow },
    { icon: ShieldCheck, label: copy.footer.tagline },
  ];

  return (
    <>
      <SiteNav copy={copy} locale={locale} />
      <main>
        <section className="mx-auto max-w-[1200px]" style={{ padding: "56px 28px 88px" }}>
          <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-2">
            {/* Left: intro + photo + trust */}
            <div>
              <Eyebrow>{p.eyebrow}</Eyebrow>
              <h1 className="display" style={{ fontSize: "clamp(32px, 4.6vw, 50px)", margin: "16px 0 0", maxWidth: "16ch", textWrap: "balance" }}>
                {p.title}
              </h1>
              <p style={{ fontSize: 18, color: "var(--muted)", margin: "18px 0 0", maxWidth: "46ch", lineHeight: 1.6 }}>{p.sub}</p>

              <Photo
                src="/images/sala-contacto.webp"
                alt="Interior de un restaurante"
                radius={22}
                focal="center"
                zoom
                style={{ marginTop: 30, minHeight: 240 }}
              />

              <ul style={{ listStyle: "none", margin: "28px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {trust.map(({ icon: Icon, label }) => (
                  <li key={label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="icon-badge" style={{ width: 38, height: 38, borderRadius: 11 }}>
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                    <span style={{ fontSize: 14.5, color: "var(--ink)" }}>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: form */}
            <div id="lead" style={{ position: "sticky", top: 96 }}>
              <SiteLeadForm lead={copy.lead} locale={locale} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter copy={copy} locale={locale} />
    </>
  );
}

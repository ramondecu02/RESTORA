// Medición y SEO técnico: los utm_* llegan hasta el registro de la app, y cada página tiene sus metadatos, su sitemap y sus datos estructurados.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { utmFromSearch, withUtm } from "../../lib/analytics";
import { APP_LOGIN_URL, APP_SIGNUP_URL, APP_URL, PUBLIC_SLUGS, SITE_URL, absoluteUrl } from "../../lib/site";
import { LOCALES } from "../../lib/types";
import { pageMetadata } from "../../lib/seo";
import { faqLd, softwareLd } from "../../lib/structured-data";
import { getPreguntas } from "../../lib/pages-copy";
import sitemap from "../../app/sitemap";
import robots from "../../app/robots";

const RAIZ = process.cwd();

test("los utm_* de la dirección se leen sin vacíos y recortados", () => {
  assert.deepEqual(utmFromSearch("?utm_source=newsletter&utm_medium=email&utm_campaign=&foo=bar"), { utm_source: "newsletter", utm_medium: "email" });
  assert.equal(utmFromSearch(`?utm_term=${"x".repeat(300)}`).utm_term.length, 100);
  assert.deepEqual(utmFromSearch(""), {});
});

test("los enlaces a la app llevan los utm_* y no pisan los que ya tenían", () => {
  const utm = { utm_source: "newsletter", utm_campaign: "otono" };
  const salida = new URL(withUtm(APP_SIGNUP_URL, utm));
  assert.equal(salida.searchParams.get("utm_source"), "newsletter");
  assert.equal(salida.searchParams.get("utm_campaign"), "otono");
  assert.equal(new URL(withUtm(`${APP_LOGIN_URL}?utm_source=ya`, utm)).searchParams.get("utm_source"), "ya");
});

test("solo se tocan los enlaces de la app (ni otros dominios ni dominios que empiezan igual)", () => {
  const utm = { utm_source: "x" };
  for (const href of ["https://example.com/registro", `${APP_URL}.evil.com/registro`, "mailto:hola@restoraapp.com", "/es/contacto", "no es un enlace"]) {
    assert.equal(withUtm(href, utm), href);
  }
  assert.equal(withUtm(APP_SIGNUP_URL, {}), APP_SIGNUP_URL);
});

test("ningún componente ni página escribe a mano la dirección de la app: todo sale de lib/site.ts", () => {
  const hallazgos: string[] = [];
  const recorre = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) recorre(p);
      else if (/\.(ts|tsx)$/.test(f) && readFileSync(p, "utf8").includes(new URL(APP_URL).host)) hallazgos.push(path.relative(RAIZ, p));
    }
  };
  for (const d of ["app", "components"]) recorre(path.join(RAIZ, d));
  assert.deepEqual(hallazgos, []);
});

test("cada ruta pública tiene canonical y hreflang correctos en los dos idiomas", () => {
  for (const slug of PUBLIC_SLUGS) {
    for (const locale of LOCALES) {
      const m = pageMetadata(locale, slug, `Título ${slug}`, "Descripción de la página");
      assert.equal(m.alternates?.canonical, absoluteUrl(locale, slug));
      const langs = m.alternates?.languages as Record<string, string>;
      assert.equal(langs.es, absoluteUrl("es", slug));
      assert.equal(langs.ca, absoluteUrl("ca", slug));
      assert.equal(langs["x-default"], absoluteUrl("es", slug));
      assert.ok(String(m.openGraph?.url).startsWith(SITE_URL));
    }
  }
});

test("el sitemap lista cada ruta pública una vez por idioma, con direcciones absolutas y sin repetir", () => {
  const urls = sitemap().map((e) => e.url);
  assert.equal(urls.length, PUBLIC_SLUGS.length * LOCALES.length);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((u) => u.startsWith(`${SITE_URL}/`)));
  for (const slug of PUBLIC_SLUGS) for (const locale of LOCALES) assert.ok(urls.includes(absoluteUrl(locale, slug)), `falta ${locale}/${slug}`);
});

test("robots deja fuera la guía de marca interna y el panel, y apunta al sitemap", () => {
  const r = robots();
  const reglas = Array.isArray(r.rules) ? r.rules : [r.rules];
  const prohibidas = reglas.flatMap((x) => (Array.isArray(x.disallow) ? x.disallow : x.disallow ? [x.disallow] : []));
  for (const ruta of ["/es/marca", "/ca/marca", "/admin", "/api/"]) assert.ok(prohibidas.includes(ruta), `robots no veta ${ruta}`);
  assert.equal(r.sitemap, `${SITE_URL}/sitemap.xml`);
});

test("datos estructurados: las preguntas son las de la página, sin precios, y nada puede cerrar la etiqueta script", () => {
  for (const locale of LOCALES) {
    const faq = faqLd(locale);
    const visibles = getPreguntas(locale).groups.flatMap((g) => g.items);
    assert.equal(faq.mainEntity.length, visibles.length);
    assert.deepEqual(faq.mainEntity.map((q) => q.name), visibles.map((i) => i.q));
    const software = JSON.stringify(softwareLd(locale));
    assert.doesNotMatch(software, /"offers"|"price"|"aggregateRating"|"telephone"|"address"/);
    assert.ok(software.includes(absoluteUrl(locale, "")));
  }
});

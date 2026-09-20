import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { VIDEO_EMBED_URL, VIDEO_POSTER } from "@/lib/site";
import { Frame } from "./frame";
import { VideoPlayer } from "./video-player";

/*
 * TODO(Ramon): vídeo de presentación — pendiente de grabar. Specs recomendadas:
 *   · Duración: 60–90 s (máx. 2 min). Primeros 5 s con el producto en pantalla.
 *   · Formato: 16:9 horizontal, 1920×1080, 25/30 fps.
 *   · Entrega: MP4 (H.264 + AAC) ≤ 25 MB, o subirlo a YouTube/Vimeo como
 *     "no listado" y pegar aquí la URL de *embed*
 *     (https://www.youtube-nocookie.com/embed/ID  ·  https://player.vimeo.com/video/ID).
 *   · Subtítulos en castellano (y catalán si es posible): el 80 % se ve sin sonido.
 *   · Miniatura: un fotograma real en .webp 1600×900 → public/images/video-poster.webp
 *     y actualizar VIDEO_POSTER en lib/site.ts.
 * Dónde configurarlo: lib/site.ts → VIDEO_EMBED_URL. Mientras esté vacío, este
 * bloque muestra el placeholder "próximamente" (sin reproductor roto).
 */

export function HomeVideo({ copy, locale }: { copy: SiteCopy; locale: Locale }) {
  const v = copy.video;
  const ready = VIDEO_EMBED_URL.trim() !== "";

  return (
    <section style={{ padding: "clamp(48px, 6vw, 88px) 28px 0" }}>
      <div className="mx-auto max-w-[1180px]">
        <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "14px 32px", marginBottom: 22 }}>
          <div style={{ minWidth: 0 }}>
            <div className="editorial-eyebrow" style={{ color: "var(--brand)" }}>{v.eyebrow}</div>
            <h2 className="display-serif" style={{ fontSize: "clamp(26px, 3.2vw, 40px)", margin: "14px 0 0", maxWidth: "20ch" }}>{v.title}</h2>
          </div>
          <p style={{ fontSize: 15.5, color: "var(--muted)", margin: 0, maxWidth: "44ch", lineHeight: 1.6 }}>{v.sub}</p>
        </div>

        <div className="reveal video-frame" style={{ position: "relative", borderRadius: 24, overflow: "hidden", border: "1px solid var(--hair)", background: "#0a0f0c", aspectRatio: "16 / 9" }}>
          {ready ? (
            <VideoPlayer src={VIDEO_EMBED_URL} poster={VIDEO_POSTER} title={v.title} playLabel={v.play} />
          ) : (
            <>
              <Frame src={VIDEO_POSTER} alt="" sizes="(max-width: 1236px) 100vw, 1180px" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,12,9,0.2) 0%, rgba(7,12,9,0.35) 55%, rgba(7,12,9,0.78) 100%)" }} />
              <div aria-hidden="true" className="grain" style={{ position: "absolute", inset: 0 }} />
              <div className="video-soon" aria-hidden="true">
                <Play size={26} strokeWidth={2.2} fill="currentColor" />
              </div>
              <span className="video-pill">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8fd3b0" }} />
                {v.eyebrow} · {v.soon}
              </span>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(14px, 3vw, 28px)", display: "flex", justifyContent: "flex-end" }}>
                <Link href={`/${locale}/contacto`} className="btn" style={{ background: "#fff", color: "#12211a", border: "1px solid #fff", padding: "12px 20px", fontSize: 14.5 }}>
                  {v.cta}
                  <ArrowRight size={15} strokeWidth={2} />
                </Link>
              </div>
            </>
          )}
        </div>
        {!ready && (
          <p className="reveal" style={{ fontSize: 14, color: "var(--muted)", margin: "14px 0 0", maxWidth: "62ch", lineHeight: 1.6 }}>
            {v.soonNote}
          </p>
        )}
      </div>
    </section>
  );
}

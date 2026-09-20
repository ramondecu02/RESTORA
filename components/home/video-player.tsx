"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Frame } from "./frame";

const isMp4 = (url: string) => /\.mp4(\?|$)/i.test(url);

/**
 * Click-to-load player: nothing from the video host is requested until the
 * visitor presses play (privacy + performance). Renders only once
 * VIDEO_EMBED_URL is configured (lib/site.ts).
 */
export function VideoPlayer({ src, poster, title, playLabel }: { src: string; poster: string; title: string; playLabel: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return isMp4(src) ? (
      <video src={src} poster={poster} controls autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    ) : (
      <iframe
        src={`${src}${src.includes("?") ? "&" : "?"}autoplay=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
      />
    );
  }

  return (
    <>
      <Frame src={poster} alt="" sizes="(max-width: 1236px) 100vw, 1180px" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,12,9,0.15) 0%, rgba(7,12,9,0.3) 55%, rgba(7,12,9,0.7) 100%)" }} />
      <button type="button" onClick={() => setPlaying(true)} aria-label={playLabel} className="video-play">
        <Play size={26} strokeWidth={2.2} fill="currentColor" />
      </button>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "clamp(16px, 3vw, 28px)", color: "#fff", fontSize: 14, fontWeight: 600 }}>{playLabel}</div>
    </>
  );
}

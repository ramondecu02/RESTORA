"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import type { Locale } from "@/lib/types";
import { whatsappUrl } from "@/lib/site";
import { WhatsAppIcon } from "./social-icons";

function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  window.addEventListener("resize", cb);
  return () => {
    window.removeEventListener("scroll", cb);
    window.removeEventListener("resize", cb);
  };
}
// Show "back to top" once the reader is clearly past the first screen.
const pastFirstScreen = () => window.scrollY > Math.max(560, window.innerHeight * 0.8);
const never = () => false;

/**
 * Floating actions on every public page: WhatsApp Business chat (wa.me with a
 * pre-filled greeting) and a back-to-top button that appears after scrolling.
 * Stacked in the bottom-right corner so they never overlap each other.
 */
export function FloatingActions({ locale, labels }: { locale: Locale; labels: SiteCopy["floating"] }) {
  const pathname = usePathname() || "";
  const showTop = useSyncExternalStore(subscribe, pastFirstScreen, never);

  // The internal admin shares this layout; keep it free of marketing widgets.
  if (pathname.includes("/admin")) return null;

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="floating-actions">
      <button
        type="button"
        onClick={toTop}
        className={`fab fab-top${showTop ? " is-visible" : ""}`}
        aria-label={labels.top}
        title={labels.top}
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
      >
        <ArrowUp size={20} strokeWidth={2.2} />
      </button>
      <a
        href={whatsappUrl(locale)}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab-wa"
        aria-label={labels.whatsapp}
        title={labels.whatsapp}
      >
        <WhatsAppIcon size={27} />
      </a>
    </div>
  );
}

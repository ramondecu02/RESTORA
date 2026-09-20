"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, Link2, Mail } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { SITE_URL } from "@/lib/site";
import { LinkedInIcon, WhatsAppIcon } from "./social-icons";

/** Share the current page by WhatsApp, LinkedIn or email (plus copy link). */
export function ShareButtons({ share, title, tone = "light" }: { share: SiteCopy["share"]; title?: string; tone?: "light" | "dark" }) {
  const pathname = usePathname() || "/";
  const [copied, setCopied] = useState(false);

  const url = `${SITE_URL}${pathname}`;
  const text = title ?? share.text;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mail = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the URL is still in the address bar */
    }
  }

  const cls = `share-btn${tone === "dark" ? " share-btn--dark" : ""}`;
  return (
    <div className={`share${tone === "dark" ? " share--dark" : ""}`} role="group" aria-label={share.label}>
      <span className="share__label">{share.label}</span>
      <a className={cls} href={wa} target="_blank" rel="noopener noreferrer" aria-label={share.whatsapp} title={share.whatsapp}>
        <WhatsAppIcon size={19} />
      </a>
      <a className={cls} href={li} target="_blank" rel="noopener noreferrer" aria-label={share.linkedin} title={share.linkedin}>
        <LinkedInIcon size={17} />
      </a>
      <a className={cls} href={mail} aria-label={share.email} title={share.email}>
        <Mail size={18} strokeWidth={1.9} />
      </a>
      <button type="button" className={cls} onClick={copyLink} aria-label={copied ? share.copied : share.copy} title={share.copy}>
        {copied ? <Check size={18} strokeWidth={2.2} /> : <Link2 size={18} strokeWidth={1.9} />}
      </button>
      <span className="share__status" role="status" aria-live="polite">
        {copied ? share.copied : ""}
      </span>
    </div>
  );
}

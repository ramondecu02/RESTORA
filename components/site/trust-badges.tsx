import { EyeOff, Lock, MapPin, Server, ShieldCheck } from "lucide-react";
import type { SiteCopy } from "@/lib/site-copy";
import { TRUST_EU_HOSTING } from "@/lib/site";

/**
 * Truthful trust signals only: HTTPS, GDPR, no tracking cookies, made in
 * Catalonia. "Data hosted in the EU" stays hidden until TRUST_EU_HOSTING is
 * confirmed (lib/site.ts). No certification seals RESTORA does not hold.
 */
export function TrustBadges({ trust, tone = "light", compact = false }: { trust: SiteCopy["trust"]; tone?: "light" | "dark"; compact?: boolean }) {
  const items = [
    { Icon: Lock, label: trust.secure },
    { Icon: ShieldCheck, label: trust.rgpd },
    { Icon: EyeOff, label: trust.noTracking },
    { Icon: MapPin, label: trust.madeIn },
    ...(TRUST_EU_HOSTING ? [{ Icon: Server, label: trust.eu }] : []),
  ];
  return (
    <ul className={`trust${tone === "dark" ? " trust--dark" : ""}${compact ? " trust--compact" : ""}`}>
      {items.map(({ Icon, label }) => (
        <li key={label}>
          <Icon size={compact ? 13 : 15} strokeWidth={2} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** One-line "secure connection" reassurance placed next to forms and prices. */
export function SecureLine({ trust, style }: { trust: SiteCopy["trust"]; style?: React.CSSProperties }) {
  return (
    <p className="secure-line" style={style}>
      <Lock size={13} strokeWidth={2.4} />
      <strong>{trust.secure}</strong>
      <span className="secure-line__note">{trust.secureNote}</span>
    </p>
  );
}

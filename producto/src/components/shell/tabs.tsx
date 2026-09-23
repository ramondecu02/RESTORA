"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../icons";
import { TABS } from "./nav";

export function Tabs({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  const cur = TABS.find((t) => t.prefixes.some((p) => path === p || path.startsWith(p + "/")))?.key ?? "mas";
  return (
    <nav className="tabs" aria-label="Secciones" data-tour="tabs">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={`tab ${cur === t.key ? "is-on" : ""}`} aria-current={cur === t.key ? "page" : undefined}>
          <Icon name={t.icon} size={22} /><span>{t.label}</span>
          {badges[t.key] ? <span className="badge">{badges[t.key]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

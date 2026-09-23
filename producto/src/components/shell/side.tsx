"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "../icons";
import { activeHref, type NavItem } from "./nav";

export function SideNav({ items, local, user, roleLabel, initials }: { items: NavItem[]; local: string; user: string; roleLabel: string; initials: string }) {
  const path = usePathname();
  const cur = activeHref(items, path);
  return (
    <nav className="side" aria-label="Menú principal" data-tour="side">
      <div className="side-brand"><Logo /><span>RESTORA</span></div>
      <div className="side-local"><b>{local}</b><small>Un local · euros</small></div>
      {items.map((it, i) => "group" in it
        ? <p className="side-lbl" key={"g" + i}>{it.group}</p>
        : (
          <Link key={it.href} href={it.href} className={`side-i ${cur === it.href ? "is-on" : ""}`} aria-current={cur === it.href ? "page" : undefined}>
            <Icon name={it.icon} /><span>{it.label}</span>
            {it.badge ? <span className="badge" aria-label={`${it.badge} pendientes`}>{it.badge}</span> : it.ro ? <span className="side-ro">Lectura</span> : null}
          </Link>
        ))}
      <div className="side-foot">
        <Link href="/cuenta" className="avatar" aria-label="Tu cuenta">{initials}</Link>
        <div><b>{user}</b><small>{roleLabel}</small></div>
      </div>
    </nav>
  );
}

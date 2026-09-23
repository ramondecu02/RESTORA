"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../icons";

type R = { href: string; label: string; kind: string };
export function TopSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<R[] | null>(null);
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/buscar?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal }).then((r) => r.json()).then((d) => { setRes(d.items ?? []); setSel(0); }).catch(() => {});
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setRes(null); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  return (
    <div className="tsearch" ref={box}>
      <Icon name="search" size={18} />
      <input className="inp" type="search" placeholder="Buscar artículo, plato o proveedor" autoComplete="off" aria-label="Buscar" value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (!res?.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(res.length - 1, s + 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          if (e.key === "Enter") { e.preventDefault(); router.push(res[sel].href); setRes(null); setQ(""); }
          if (e.key === "Escape") setRes(null);
        }} />
      {res ? (
        <div className="tsearch-res" role="listbox">
          {res.length ? res.map((r, i) => (
            <Link key={r.href} href={r.href} className={`tsr-i ${i === sel ? "is-on" : ""}`} role="option" aria-selected={i === sel} onClick={() => { setRes(null); setQ(""); }}>
              <span>{r.label}</span><small>{r.kind}</small>
            </Link>
          )) : <p className="tsr-empty">Sin resultados para «{q}».</p>}
        </div>
      ) : null}
    </div>
  );
}

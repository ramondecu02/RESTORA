"use client";
// Avisos breves. toast() se puede llamar desde cualquier componente cliente.
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

type T = { id: number; msg: string; tone: "ok" | "bad"; action?: { label: string; onClick: () => void } };
let items: T[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let seq = 0;

export function toast(msg: string, opts: { tone?: "ok" | "bad"; action?: T["action"]; ms?: number } = {}) {
  const id = ++seq;
  items = [{ id, msg, tone: opts.tone ?? "ok", action: opts.action }]; // uno cada vez: no tapan botones
  emit();
  setTimeout(() => { items = items.filter((x) => x.id !== id); emit(); }, opts.ms ?? 3200);
}
export const toastError = (msg: string) => toast(msg, { tone: "bad", ms: 5000 });

/** El valor de rs_flash llega codificado dos veces (setFlash y el serializador de cookies de Next):
 *  se decodifica mientras queden secuencias %XX, como mucho dos veces. null si la cookie está corrupta. */
export function decodeFlash(raw: string): string | null {
  let s = raw;
  for (let i = 0; i < 2 && /%[0-9a-f]{2}/i.test(s); i++) {
    try { s = decodeURIComponent(s); } catch { return i ? s : null; }
  }
  return s;
}

function readFlash() {
  const m = document.cookie.match(/(?:^|;\s*)rs_flash=([^;]*)/);
  if (!m) return;
  document.cookie = "rs_flash=; Max-Age=0; path=/";
  const msg = decodeFlash(m[1]);
  if (msg) toast(msg);
}

export function Toasts() {
  const list = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => items, () => items);
  const path = usePathname();
  useEffect(() => { readFlash(); }, [path]);
  return (
    <div className="toasts" aria-live="polite" role="status">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.tone === "bad" ? "bad" : ""}`}>
          <span>{t.msg}</span>
          {t.action ? <button type="button" onClick={() => { t.action!.onClick(); items = []; emit(); }}>{t.action.label}</button> : null}
        </div>
      ))}
    </div>
  );
}

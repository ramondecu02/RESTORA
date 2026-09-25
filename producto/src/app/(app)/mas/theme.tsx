"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { cambiarTema } from "../prefs-actions";

export function ThemeQuick({ actual }: { actual: "light" | "dark" | "system" }) {
  const [t, setT] = useState(actual);
  const set = (v: "light" | "dark" | "system") => {
    setT(v);
    if (v === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", v);
    cambiarTema(v);
  };
  return (
    <div className="seg" role="radiogroup" aria-label="Tema">
      {([["light", "Claro", "sun"], ["dark", "Oscuro", "moon"], ["system", "Sistema", "settings"]] as const).map(([v, l, ic]) => (
        <button key={v} type="button" role="radio" aria-checked={t === v} className={t === v ? "is-on" : ""} onClick={() => set(v)}><Icon name={ic} size={16} /> {l}</button>))}
    </div>
  );
}

/** Aplica en este dispositivo el tema guardado en la cuenta y lo deja en su cookie, que es la que lee el servidor al pintar la página. */
export function ThemeSync({ theme }: { theme: "light" | "dark" | "system" }) {
  useEffect(() => {
    const secure = location.protocol === "https:" ? "; secure" : "";
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
      document.cookie = `rs_theme=; path=/; max-age=0; samesite=lax${secure}`;
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      document.cookie = `rs_theme=${theme}; path=/; max-age=${365 * 24 * 3600}; samesite=lax${secure}`;
    }
  }, [theme]);
  return null;
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const THEME_EVENT = "restora-theme-change";

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Reads the theme the no-flash script established on <html data-theme> via an
// external store (no setState-in-effect), and flips it on click.
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("restora-theme", next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      title="Claro / Oscuro"
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-line bg-transparent text-[15px] leading-none text-ink"
    >
      <span suppressHydrationWarning>{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// Animated number that counts up from 0 to `end` the first time it scrolls into
// view. Server/no-JS render shows the final formatted value, so it degrades
// gracefully and never causes layout shift.
export function CountUp({
  end,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1200,
}: {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const fmt = (n: number) =>
    prefix +
    n.toLocaleString("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;

  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(() => fmt(end));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") return;

    let raf = 0;
    let started = false;
    const run = () => {
      started = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setText(fmt(end * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, decimals, prefix, suffix, duration]);

  return (
    <span ref={ref} className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>
      {text}
    </span>
  );
}

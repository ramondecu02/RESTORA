"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// A template remounts on every route change, so this runs per navigation:
//  1) jump to the top of the new page (instant, ignoring smooth-scroll),
//  2) fade the page in (.page-fade),
//  3) wire up IntersectionObserver-driven scroll reveals for this page.
export default function LocaleTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Always start a new page at the very top — force an instant jump even
    // though html has scroll-behavior: smooth (for in-page anchors), and
    // re-assert it once the first paint/reflow settles so late-loading media
    // can't leave the page a few pixels down.
    const html = document.documentElement;
    const snap = (force: boolean) => {
      // Only correct small strays (font swap / media reflow); never yank a
      // reader who has deliberately scrolled away.
      if (!force && window.scrollY > 160) return;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      html.style.scrollBehavior = prev;
    };
    snap(true);
    const raf = requestAnimationFrame(() => snap(true));
    const timers = [120, 320, 650].map((ms) => window.setTimeout(() => snap(false), ms));

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal, .reveal-group"),
    );

    // No IntersectionObserver (or reduced motion) → reveal everything immediately.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-visible"));
      return () => {
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
      };
    }

    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    targets.forEach((el) => {
      // If already in view on load, reveal without waiting.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add("is-visible");
      } else {
        io.observe(el);
      }
    });

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  return (
    <div key={pathname} className="page-fade">
      {children}
    </div>
  );
}

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
            pending.delete(entry.target as HTMLElement);
          }
        });
      },
      // threshold 0 (not a ratio): a tall block, or a jump-scroll past it,
      // must never leave content stuck invisible. The negative bottom margin
      // is what delays the reveal until the block is properly on screen.
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );

    // Anything at or above this line counts as "arrived".
    const revealLine = () => window.innerHeight * 0.92;
    const pending = new Set<HTMLElement>();

    targets.forEach((el) => {
      // If already in view on load, reveal without waiting.
      if (el.getBoundingClientRect().top < revealLine()) {
        el.classList.add("is-visible");
      } else {
        pending.add(el);
        io.observe(el);
      }
    });

    // The observer alone can be outrun by a jump: End, a scrollbar drag or an
    // anchor can move the page further in one frame than it can report. Sweep
    // on scroll so nothing the reader has already passed stays invisible.
    let ticking = false;
    const sweep = () => {
      ticking = false;
      if (pending.size === 0) return;
      const line = revealLine();
      for (const el of pending) {
        if (el.getBoundingClientRect().top < line) {
          el.classList.add("is-visible");
          io.unobserve(el);
          pending.delete(el);
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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

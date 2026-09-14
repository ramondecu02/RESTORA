"use client";

import { useEffect, useState } from "react";

// Sticky quick-access button to the lead form; appears after the hero.
export function FloatingCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#lead"
      className="floating-cta btn btn-brand"
      data-show={show ? "true" : "false"}
      aria-hidden={show ? undefined : "true"}
      tabIndex={show ? undefined : -1}
      style={{ padding: "13px 20px", fontSize: 15 }}
    >
      {label} →
    </a>
  );
}

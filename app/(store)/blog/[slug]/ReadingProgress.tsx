"use client";

import { useEffect, useState } from "react";

/* Subtle reading-progress bar fixed to the top of the viewport. */
export default function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setPct(total > 0 ? Math.min(100, (el.scrollTop / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden>
      <div className="h-full bg-terra transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}

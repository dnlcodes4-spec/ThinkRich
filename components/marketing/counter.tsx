"use client";

import { useEffect, useRef } from "react";

// Counts up to `to` when scrolled into view. SSR renders the final value (so
// no-JS and reduced-motion users see the real number), then JS animates
// textContent via rAF — no setState.
export function Counter({
  to,
  suffix = "",
  duration = 1500,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const format = (n: number) => `${Math.round(n).toLocaleString("en-NG")}${suffix}`;
    el.textContent = format(0);
    let raf = 0;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = format(to * eased);
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [to, suffix, duration]);

  return (
    <span ref={ref} className={className}>
      {to.toLocaleString("en-NG")}
      {suffix}
    </span>
  );
}

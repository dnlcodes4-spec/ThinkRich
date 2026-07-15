"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Grain } from "./motifs";
import { ThinkRichWordmark } from "./arm-mark";

const links = [
  { href: "#community", label: "The Community" },
  { href: "#arms", label: "The Arms" },
  { href: "#philosophy", label: "Philosophy" },
];

function useScrolled() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("scroll", cb, { passive: true });
      return () => window.removeEventListener("scroll", cb);
    },
    () => window.scrollY > 24,
    () => false,
  );
}

const linkCls =
  "text-sm font-medium text-navy-50/90 transition-colors hover:text-gold-400 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]";

export function ThinkRichNav() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const solid = scrolled || open;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 text-navy-50 transition-colors duration-300 ${
          solid
            ? "border-b border-navy-50/10 bg-navy-950/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 transition-all duration-300 ${
            solid ? "py-3" : "py-5"
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5 text-navy-50" aria-label="ThinkRich Community, back to top">
            <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg border border-gold-400/30 bg-navy-900 font-display text-sm font-black text-gold-400">
              TR
            </span>
            <ThinkRichWordmark className="text-navy-50 [text-shadow:0_1px_10px_rgba(0,0,0,0.5)]" />
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className={linkCls}>
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/think-winners"
              className="hidden items-center gap-1.5 rounded-md border border-gold-400/40 px-3.5 py-2 text-sm font-semibold text-gold-300 transition-colors hover:border-gold-400 hover:text-gold-200 sm:inline-flex"
            >
              <span aria-hidden="true" className="tw-ignite h-1.5 w-1.5 rounded-full bg-gold-400" />
              Think-Winners
            </Link>
            <a
              href="#join"
              className="hidden rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 sm:inline-flex"
            >
              Get involved
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid h-11 w-11 place-items-center rounded-md text-navy-50 transition-colors hover:bg-navy-50/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 md:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-navy-950 text-navy-50 md:hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(60% 45% at 100% 0%, rgba(201,162,39,0.16), transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(10,42,78,0.9), transparent 60%)",
            }}
          />
          <Grain opacity={0.08} />
          <div className="relative flex flex-1 flex-col px-6 pb-10 pt-28">
            <nav className="flex flex-col">
              {links.map((l, i) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="tw-rise group flex items-center justify-between border-b border-navy-50/10 py-5"
                  style={{ animationDelay: `${80 + i * 70}ms` }}
                >
                  <span className="font-display text-3xl font-semibold text-navy-50 transition-colors group-hover:text-gold-400">
                    {l.label}
                  </span>
                  <span aria-hidden="true" className="text-xl text-gold-500/70 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              ))}
              <Link
                href="/think-winners"
                onClick={() => setOpen(false)}
                className="tw-rise group flex items-center justify-between border-b border-navy-50/10 py-5"
                style={{ animationDelay: `${80 + links.length * 70}ms` }}
              >
                <span className="flex items-center gap-3 font-display text-3xl font-semibold text-gold-400">
                  <span aria-hidden="true" className="tw-ignite h-2.5 w-2.5 rounded-full bg-gold-400" />
                  Think-Winners
                </span>
                <span aria-hidden="true" className="text-xl text-gold-500/70 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </nav>
            <div className="mt-auto">
              <a
                href="#join"
                onClick={() => setOpen(false)}
                className="tw-rise flex min-h-14 items-center justify-center rounded-md bg-gold-500 text-base font-bold text-navy-950 transition-colors hover:bg-gold-400"
                style={{ animationDelay: `${80 + (links.length + 1) * 70}ms` }}
              >
                Get involved
              </a>
              <p
                className="tw-rise mt-6 font-display text-lg italic text-navy-50/55"
                style={{ animationDelay: `${140 + (links.length + 1) * 70}ms` }}
              >
                Creating Value for Mankind.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

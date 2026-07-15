"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { Grain } from "./motifs";

const leftLinks = [
  { href: "#about", label: "Who we are" },
  { href: "#offer", label: "What we offer" },
];
const rightLinks = [
  { href: "#how", label: "How we work" },
  { href: "#partnership", label: "Partnership" },
];
const allLinks = [...leftLinks, ...rightLinks];

// Solid once the hero has scrolled past; transparent while over the full-screen hero.
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
  "text-sm font-medium text-navy-50 transition-colors hover:text-gold-400 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]";

export function ThinkWinnersNav() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const solid = scrolled || open;

  // Lock background scroll while the full-screen menu is open.
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
          className={`mx-auto grid max-w-6xl grid-cols-[auto_auto] items-center gap-4 px-6 transition-all duration-300 md:grid-cols-[1fr_auto_1fr] ${
            solid ? "py-2.5" : "py-4"
          }`}
        >
          {/* Left links (desktop) */}
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/" className={`${linkCls} flex items-center gap-1.5`}>
              <span aria-hidden="true">←</span> ThinkRich
            </Link>
            {leftLinks.map((l) => (
              <a key={l.href} href={l.href} className={linkCls}>
                {l.label}
              </a>
            ))}
          </nav>

          {/* Centered logo */}
          <a
            href="#top"
            aria-label="Think-Winners, back to top"
            className="justify-self-start md:justify-self-center"
          >
            <Image
              src="/think-winners/logo-mark-light.png"
              alt="Think-Winners"
              width={911}
              height={582}
              priority
              className="h-10 w-auto drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:h-11"
            />
          </a>

          {/* Right links + CTA (desktop) / menu toggle (mobile) */}
          <div className="flex items-center justify-end gap-7">
            <nav className="hidden items-center gap-7 md:flex">
              {rightLinks.map((l) => (
                <a key={l.href} href={l.href} className={linkCls}>
                  {l.label}
                </a>
              ))}
            </nav>
            <a
              href="#partnership"
              className="hidden rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 lg:inline-flex"
            >
              Partner with us
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

      {/* Full-screen cinematic mobile menu (sibling of header so `fixed` fills the viewport) */}
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
              {allLinks.map((l, i) => (
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
                  <span
                    aria-hidden="true"
                    className="text-xl text-gold-500/70 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              ))}
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="tw-rise group flex items-center justify-between border-b border-navy-50/10 py-5"
                style={{ animationDelay: `${80 + allLinks.length * 70}ms` }}
              >
                <span className="flex items-center gap-3 font-display text-3xl font-semibold text-navy-50/80 transition-colors group-hover:text-gold-400">
                  <span aria-hidden="true" className="text-gold-500/70">←</span>
                  ThinkRich
                </span>
              </Link>
            </nav>

            <div className="mt-auto">
              <a
                href="#partnership"
                onClick={() => setOpen(false)}
                className="tw-rise flex min-h-14 items-center justify-center rounded-md bg-gold-500 text-base font-bold text-navy-950 transition-colors hover:bg-gold-400"
                style={{ animationDelay: `${80 + (allLinks.length + 1) * 70}ms` }}
              >
                Partner with us
              </a>
              <p
                className="tw-rise mt-6 font-display text-lg italic text-navy-50/55"
                style={{ animationDelay: `${140 + (allLinks.length + 1) * 70}ms` }}
              >
                Thinking Together, Winning Together
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

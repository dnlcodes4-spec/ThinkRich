"use client";

import { useState, useSyncExternalStore } from "react";
import { BrandMark } from "./icons";

const links = [
  { href: "#offer", label: "What we offer" },
  { href: "#reach", label: "Reach" },
  { href: "#how", label: "How we work" },
  { href: "#partnership", label: "Partnership" },
];

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

export function ThinkWinnersNav() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-green-50 transition-colors duration-300 ${
        solid
          ? "border-b border-green-50/10 bg-green-950/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <a
          href="#top"
          className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]"
        >
          <BrandMark className="h-8 w-8 text-gold-400" />
          Think-Winners
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-green-50/85 transition-colors hover:text-gold-400 [text-shadow:0_1px_12px_rgba(0,0,0,0.4)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#partnership"
            className="hidden rounded-md bg-gold-500 px-4 py-2 text-sm font-bold text-green-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 sm:inline-flex"
          >
            Partner with us
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-md text-green-50 transition-colors hover:bg-green-50/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-green-50/10 bg-green-950/95 px-6 py-4 backdrop-blur-md md:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-base font-medium text-green-50/85 hover:bg-green-50/10"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="mt-2">
              <a
                href="#partnership"
                onClick={() => setOpen(false)}
                className="block rounded-md bg-gold-500 px-4 py-3 text-center text-sm font-bold text-green-950"
              >
                Partner with us
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

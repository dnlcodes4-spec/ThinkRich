"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// Tabs for the candidates admin area. "Constituency areas" is national-admin only,
// so the page decides whether to pass it in.
export function CandidateTabs({ showAreas }: { showAreas: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/app/admin/candidates", label: "Candidates" },
    ...(showAreas ? [{ href: "/app/admin/candidates/areas", label: "Constituency areas" }] : []),
  ];
  return (
    <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Candidates sections">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

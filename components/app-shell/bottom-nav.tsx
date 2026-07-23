"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";
import { isActive, type NavItem } from "./nav";

// Mobile navigation (below lg). Up to five destinations fit as tabs; anything
// beyond that collapses into a "More" tab that opens a bottom sheet, so a
// coordinator's longer list stays reachable without crowding the bar.
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const overflow = items.length > 5;
  const tabs = overflow ? items.slice(0, 4) : items;
  const moreItems = overflow ? items.slice(4) : [];
  const moreActive = moreItems.some((i) => isActive(pathname, i.href));

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-ink-950/40"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border" />
            <nav className="grid grid-cols-1 gap-1 p-1">
              {moreItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-colors",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-surface-muted",
                    )}
                  >
                    <Icon name={item.icon} className="size-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      <nav className="sticky bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {tabs.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[0.6875rem] font-semibold transition-colors",
                active ? "text-primary" : "text-muted hover:text-foreground",
              )}
            >
              <Icon name={item.icon} className="size-6" />
              <span className="max-w-full truncate">{item.short ?? item.label}</span>
            </Link>
          );
        })}
        {overflow ? (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[0.6875rem] font-semibold transition-colors",
              moreActive ? "text-primary" : "text-muted hover:text-foreground",
            )}
          >
            <Icon name="more" className="size-6" />
            <span>More</span>
          </button>
        ) : null}
      </nav>
    </>
  );
}

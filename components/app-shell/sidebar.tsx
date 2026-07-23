"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";
import { isActive, type NavItem } from "./nav";

// Desktop navigation rail (lg+). Holds the brand mark and the role's full set of
// destinations; the header carries notifications and the account menu.
export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/app" className="flex items-center" aria-label="ThinkRich home">
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Think<span className="text-accent">Rich</span>
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/login/actions";
import { Icon } from "./icons";
import { isActive, type NavItem } from "./nav";

// Desktop navigation rail (lg+). Holds the brand mark, the role's full set of
// destinations, and a pinned account block (profile + sign out) at the bottom.
// The header carries the same account menu for mobile, where there is no rail.
export function Sidebar({
  items,
  name,
  roleLabel,
}: {
  items: NavItem[];
  name: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const accountActive = isActive(pathname, "/app/account");
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/app" className="flex items-center gap-2" aria-label="ThinkRich home">
          <Image
            src="/logos/ThinkrichCommunity_transparent.png"
            alt=""
            width={1072}
            height={1072}
            className="size-8 shrink-0 object-contain"
            priority
          />
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

      <div className="border-t border-border p-3">
        <Link
          href="/app/account"
          aria-current={accountActive ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            accountActive ? "bg-primary/10" : "hover:bg-surface-muted",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {name || "Your account"}
            </span>
            <span className="block truncate text-xs text-muted">{roleLabel}</span>
          </span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="signout" className="size-5 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

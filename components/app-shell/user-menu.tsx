"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import { Icon } from "./icons";

// The "You" menu in the header: shows who is signed in and where to go for
// account actions. Notifications are a separate header control. Closes on
// outside-click and Escape; sign-out posts the existing server action.
export function UserMenu({
  name,
  roleLabel,
  email,
}: {
  name: string;
  roleLabel: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-9 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{name || "You"}</span>
        <Icon name="chevron" className="size-4 text-muted" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{name || "Your account"}</p>
            <p className="truncate text-xs text-muted">{roleLabel}</p>
            {email ? <p className="mt-0.5 truncate text-xs text-muted">{email}</p> : null}
          </div>
          <Link
            href="/app/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-muted"
          >
            <Icon name="profile" className="size-4 text-muted" />
            Your account
          </Link>
          <form action={signOut} className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-muted"
            >
              <Icon name="signout" className="size-4 text-muted" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icons";
import { UserMenu } from "./user-menu";

// Top bar for the app shell. The brand mark shows on mobile only (the desktop
// sidebar already carries it). Notifications and the account menu live here at
// every breakpoint, so they are reachable independent of the nav destinations.
export function AppHeader({
  name,
  roleLabel,
  email,
  unread,
}: {
  name: string;
  roleLabel: string;
  email: string;
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6">
      <Link href="/app" className="flex items-center gap-2 lg:hidden" aria-label="ThinkRich home">
        <Image
          src="/logos/ThinkrichCommunity_transparent.png"
          alt=""
          width={1072}
          height={1072}
          className="size-7 shrink-0 object-contain"
          priority
        />
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          Think<span className="text-accent">Rich</span>
        </span>
      </Link>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <Link
          href="/app/notifications"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative grid size-9 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Icon name="bell" className="size-5" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-5 text-accent-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Link>
        <UserMenu name={name} roleLabel={roleLabel} email={email} />
      </div>
    </header>
  );
}

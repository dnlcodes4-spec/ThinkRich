import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markRead, markAllRead } from "./actions";
import { ComposeAnnouncement } from "./compose";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

// The notification centre: a user's own notifications (RLS-scoped), newest first,
// with unread markers and mark-read. Non-members can also send an announcement.
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = notifications ?? [];
  const unread = rows.filter((n) => !n.read_at).length;

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted">
            {unread > 0 ? `${unread} unread` : "All caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllRead}>
            <button
              type="submit"
              className="min-h-9 rounded-md border border-ring px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
            >
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {profile && profile.role !== "member" ? (
        <div className="mt-6">
          <ComposeAnnouncement />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">No notifications yet.</p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {rows.map((n) => {
            const isUnread = !n.read_at;
            return (
              <li
                key={n.id}
                className={
                  isUnread
                    ? "rounded-card border border-accent/40 bg-surface p-4"
                    : "rounded-card border border-border bg-surface p-4"
                }
              >
                <div className="flex items-start gap-3">
                  <span
                    className={"mt-1.5 size-2 shrink-0 rounded-full " + (isUnread ? "bg-accent" : "bg-transparent")}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-muted">{when(n.created_at)}</span>
                      {n.link ? (
                        <Link href={n.link} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                          View
                        </Link>
                      ) : null}
                      {isUnread ? (
                        <form action={markRead}>
                          <input type="hidden" name="id" value={n.id} />
                          <button type="submit" className="text-xs font-semibold text-muted hover:text-foreground">
                            Mark read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

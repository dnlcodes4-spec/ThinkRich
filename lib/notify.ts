import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push";

// Server-side notification fan-out: inserts one row per recipient (the in-app
// source of truth), then sends a best-effort Web Push. Used by Server Actions
// (announcements) and system events (e.g. a change-request decision). Uses the
// service role, so callers must have already authorized the send.
export async function notify(
  userIds: string[],
  n: { type: string; title: string; body?: string | null; link?: string | null; createdBy?: string | null },
): Promise<number> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return 0;
  const admin = createAdminClient();
  const rows = unique.map((user_id) => ({
    user_id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    created_by: n.createdBy ?? null,
  }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await admin.from("notifications").insert(rows.slice(i, i + 1000));
    if (error) throw new Error(error.message);
  }

  // Best-effort Web Push (title + link only, no PII); never blocks the in-app write.
  try {
    await sendPushToUsers(unique, { title: n.title, body: n.body, link: n.link });
  } catch {
    /* push is a re-engagement layer, not the source of truth */
  }

  return unique.length;
}

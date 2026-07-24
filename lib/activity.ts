import { tryCreateAdminClient } from "@/lib/supabase/admin";

// Append an entry to the activity log. Writes use the service role (the table has
// no insert policy, so nothing holding a user JWT can forge an entry).
//
// Logging is deliberately BEST EFFORT: it never throws and never blocks the
// action that triggered it. Failing to record that a member was registered must
// not stop the member being registered.

export type ActivityAction =
  | "member.registered"
  | "member.paused"
  | "member.reactivated"
  | "member.removed"
  | "member.login_reset"
  | "account.created"
  | "account.deactivated"
  | "account.reactivated"
  | "account.deleted"
  | "correction.approved"
  | "correction.declined"
  | "state.activated"
  | "state.deactivated"
  | "candidate.saved"
  | "announcement.sent";

export type ActivityEntry = {
  actorId: string | null;
  actorName: string;
  actorRole?: string | null;
  action: ActivityAction;
  summary: string;
  subjectType?: string | null;
  subjectId?: string | null;
  stateId?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Log an action, resolving the actor's name and role from their id so callers
 * don't have to widen their own queries. Best effort, like `logActivity`.
 */
export async function logActivityAs(
  actorId: string | null,
  entry: Omit<ActivityEntry, "actorId" | "actorName" | "actorRole">,
): Promise<void> {
  try {
    const admin = tryCreateAdminClient();
    if (!admin) return;
    let actorName = "Unknown";
    let actorRole: string | null = null;
    if (actorId) {
      const { data } = await admin
        .from("profiles")
        .select("full_name, role")
        .eq("id", actorId)
        .maybeSingle();
      actorName = data?.full_name ?? "Unknown";
      actorRole = data?.role ?? null;
    }
    await logActivity({ ...entry, actorId, actorName, actorRole });
  } catch {
    // Never let logging break the operation it is recording.
  }
}

export async function logActivity(entry: ActivityEntry): Promise<void> {
  try {
    const admin = tryCreateAdminClient();
    if (!admin) return;
    await admin.from("activity_log").insert({
      actor_id: entry.actorId,
      actor_name: entry.actorName,
      actor_role: entry.actorRole ?? null,
      action: entry.action,
      summary: entry.summary,
      subject_type: entry.subjectType ?? null,
      subject_id: entry.subjectId ?? null,
      state_id: entry.stateId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch {
    // Never let logging break the operation it is recording.
  }
}

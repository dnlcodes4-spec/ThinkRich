import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { logActivityAs } from "@/lib/activity";

/**
 * Open a state for member registration because it now has a State Coordinator
 * ("active once a State Admin is assigned", T-019). Called from both paths that
 * can appoint one: creating the account, and promoting an existing one.
 *
 * `states` is reference data with no write policy by design, so this needs the
 * service role. Best effort, like the activity log: the appointment that
 * triggered it has already succeeded and must not be undone by a failure here.
 *
 * The closing direction is deliberately NOT here. Losing the last coordinator
 * closes the state in the database (migration 0031), where no code path can
 * forget it. Opening stays an intentional act: this function, or the toggle on
 * /app/admin/states.
 */
export async function openStateFor(actorId: string | null, stateId: string): Promise<void> {
  try {
    const admin = tryCreateAdminClient();
    if (!admin) return;

    // `eq("is_active", false)` so an already-open state is a no-op that logs
    // nothing. The log should record events, not restatements: a flag changing
    // with nothing to explain it is what made the stale Ogun/Oyo activation so
    // hard to account for.
    const { data: opened } = await admin
      .from("states")
      .update({ is_active: true })
      .eq("id", stateId)
      .eq("is_active", false)
      .select("id, name")
      .maybeSingle();
    if (!opened) return;

    await logActivityAs(actorId, {
      action: "state.activated",
      summary: `Opened ${opened.name} for registration: a State Coordinator was assigned`,
      subjectType: "state",
      subjectId: opened.id,
      stateId: opened.id,
    });
  } catch {
    // Best effort by design: never block the appointment.
  }
}

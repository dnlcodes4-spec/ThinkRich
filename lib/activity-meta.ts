// Single source of truth for activity-log action types and how they read on the
// Activity page. The logger (lib/activity.ts), every emitter, and the page all
// import from here, so an action can never be recorded with a key the page does
// not know how to show (the drift that hid role changes behind their raw key).
//
// `ACTION_META` is a Record over the union, so adding an action to the union
// without giving it a label/tone is a TYPE ERROR, not a silent gap.

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
  | "account.promoted"
  | "account.role_changed"
  | "correction.approved"
  | "correction.declined"
  | "state.activated"
  | "state.deactivated"
  | "candidate.saved"
  | "candidate.removed"
  | "announcement.sent";

export type ActionTone = "neutral" | "good" | "warn" | "bad";

// Plain-language label + tone for each action. Base-tier people are "voters"
// (CR-0020); "account" is a staff login; "member"/"membership" stays for the
// personal record senses.
export const ACTION_META: Record<ActivityAction, { label: string; tone: ActionTone }> = {
  "member.registered": { label: "Voter registered", tone: "good" },
  "member.paused": { label: "Voter paused", tone: "warn" },
  "member.reactivated": { label: "Voter reactivated", tone: "good" },
  "member.removed": { label: "Voter removed", tone: "bad" },
  "member.login_reset": { label: "Login password reset", tone: "warn" },
  "account.created": { label: "Account created", tone: "good" },
  "account.deactivated": { label: "Account deactivated", tone: "warn" },
  "account.reactivated": { label: "Account reactivated", tone: "good" },
  "account.deleted": { label: "Account deleted", tone: "bad" },
  "account.promoted": { label: "Account promoted", tone: "good" },
  "account.role_changed": { label: "Role changed", tone: "neutral" },
  "correction.approved": { label: "Correction applied", tone: "good" },
  "correction.declined": { label: "Correction declined", tone: "warn" },
  "state.activated": { label: "State activated", tone: "good" },
  "state.deactivated": { label: "State deactivated", tone: "warn" },
  "candidate.saved": { label: "Candidate updated", tone: "neutral" },
  "candidate.removed": { label: "Candidate removed", tone: "warn" },
  "announcement.sent": { label: "Announcement sent", tone: "neutral" },
};

/** Ordered keys for the page's filter chips (grouped by domain). */
export const ACTION_KEYS = Object.keys(ACTION_META) as ActivityAction[];

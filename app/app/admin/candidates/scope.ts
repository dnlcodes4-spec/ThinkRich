import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type CandidateLevel = Database["public"]["Enums"]["candidate_level"];

// Which candidate an admin manages: national -> presidential, state admin ->
// their state's candidate, LG admin -> their LGA's candidate. Nobody else.
export const CANDIDATE_SCOPE: Partial<Record<Role, { level: CandidateLevel; geo: "none" | "state" | "lga" }>> = {
  national_admin: { level: "presidential", geo: "none" },
  state_admin: { level: "state", geo: "state" },
  lg_admin: { level: "lg", geo: "lga" },
};

export const LEVEL_LABEL: Record<CandidateLevel, string> = {
  presidential: "Presidential candidate",
  state: "Governorship candidate",
  lg: "LGA chairman candidate",
};

export const CANDIDATE_PHOTOS_BUCKET = "candidate-photos";

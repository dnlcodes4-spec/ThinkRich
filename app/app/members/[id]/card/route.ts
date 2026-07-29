import { createClient } from "@/lib/supabase/server";
import { buildMembershipCard, cardFileName } from "@/lib/membership-card";

// Membership card download (T-048, CR-0009 §3.5).
//
// A NEW DATA-EGRESS SURFACE, so authorization is the point of this file.
//
// It uses the CALLER's own client, never the service role, so `members_select`
// decides what may be fetched: a member sees only their own record, a leader only
// the members they registered, each admin only their own area. A request for
// someone else's card returns the same 404 as a card that does not exist, so the
// route cannot be used to probe which membership ids are real.

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Not found", { status: 404 });

  // RLS scopes this read. Seeing the row IS the authorization check.
  const { data: member } = await supabase
    .from("members")
    .select("membership_number, full_name, gender, status, state_id, lga_id, ward_id")
    .eq("id", id)
    .maybeSingle();

  if (!member) return new Response("Not found", { status: 404 });

  // A frozen or removed member must not be able to present a current card.
  if (member.status !== "active") {
    return new Response("This membership is not active.", { status: 403 });
  }

  const [{ data: state }, { data: lga }, { data: ward }] = await Promise.all([
    supabase.from("states").select("name").eq("id", member.state_id).maybeSingle(),
    supabase.from("lgas").select("name").eq("id", member.lga_id).maybeSingle(),
    supabase.from("wards").select("ward_number").eq("id", member.ward_id).maybeSingle(),
  ]);

  const svg = await buildMembershipCard({
    fullName: member.full_name,
    gender: member.gender,
    stateName: state?.name ?? "",
    lgaName: lga?.name ?? "",
    // System-assigned ordinal within the LGA, not an INEC code. See migration 0027.
    wardNumber: ward?.ward_number ?? 0,
    membershipNumber: member.membership_number,
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${cardFileName(member.membership_number)}"`,
      // Cards carry personal data and must never be held by a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}

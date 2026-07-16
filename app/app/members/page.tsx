import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DataTable, type Column } from "@/components/ui/data-table";
import { RecordCard } from "@/components/ui/record-card";
import { StatusPill, type MemberStatus } from "@/components/ui/status-pill";

export const metadata: Metadata = {
  title: "Members",
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  membership_number: string;
  full_name: string;
  status: MemberStatus;
  created_at: string;
};

// The list is scoped by RLS: a leader sees the members they registered; admins
// see the members within their geography. No scope logic in the app.
export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isLeader = profile?.role === "leader";

  const { data } = await supabase
    .from("members")
    .select("id, membership_number, full_name, status, created_at")
    .order("membership_number", { ascending: true });
  const rows = (data ?? []) as Row[];

  const registered = (r: Row) =>
    new Date(r.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  const columns: Column<Row>[] = [
    { key: "name", header: "Member", render: (r) => <span className="font-medium">{r.full_name}</span> },
    { key: "number", header: "Number", className: "font-mono", render: (r) => r.membership_number },
    { key: "registered", header: "Registered", render: (r) => registered(r) },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {isLeader ? "Your members" : "Members"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} {rows.length === 1 ? "member" : "members"} in your scope.
          </p>
        </div>
        {isLeader ? (
          <Link
            href="/app/register"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Register a member
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            No members yet.{" "}
            {isLeader ? (
              <Link href="/app/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                Register your first member.
              </Link>
            ) : (
              "Members appear here once leaders in your scope register them."
            )}
          </p>
        </div>
      ) : (
        <>
          <DataTable
            className="mt-8 hidden lg:block"
            columns={columns}
            rows={rows}
            getRowKey={(r) => r.id}
            caption="Members in your scope"
          />
          <ul className="mt-8 flex flex-col gap-3 lg:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <RecordCard
                  name={r.full_name}
                  identifier={r.membership_number}
                  facts={`Registered ${registered(r)}`}
                  status={r.status}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

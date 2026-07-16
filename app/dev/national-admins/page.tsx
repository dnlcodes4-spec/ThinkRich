import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteNationalAdmin } from "./actions";
import { CreateNationalAdminForm } from "./create-form";

export const metadata: Metadata = {
  title: "Dev · National admins",
  robots: { index: false, follow: false },
};

// DEV-ONLY (ADR-0012). Bootstraps the first national admin, since nothing sits
// above it in the provisioning chain. Returns 404 in production; the prod bootstrap
// is a deliberate one-time DB seed, not a page.
export default async function NationalAdminsDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("profiles")
    .select("id, full_name, status, created_at")
    .eq("role", "national_admin")
    .order("created_at", { ascending: true });

  // Emails live in auth.users, not profiles — join them in for display.
  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const admins = (rows ?? []).map((r) => ({ ...r, email: emailById.get(r.id) ?? "—" }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <div className="rounded-md border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
        <strong className="font-semibold">Development tool.</strong> This page does not exist in
        production. There it is a one-time database seed (see ADR-0012).
      </div>

      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight text-foreground">
        National admins
      </h1>
      <p className="mt-2 text-sm text-muted">
        The top of the provisioning chain. Create one here to bootstrap a fresh environment, then
        sign in as them to provision states and below.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Create</h2>
        <div className="mt-3">
          <CreateNationalAdminForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">
          Existing <span className="text-muted">({admins.length})</span>
        </h2>
        {admins.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">
            None yet. Create the first one above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{a.full_name}</p>
                  <p className="truncate text-xs text-muted">{a.email}</p>
                </div>
                <form action={deleteNationalAdmin}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="min-h-9 rounded-md border border-danger/40 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

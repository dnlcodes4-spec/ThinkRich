import { createClient } from "@/lib/supabase/server";

// Placeholder protected route. The proxy redirects unauthenticated users to
// /login before this renders; the page still reads the user itself, because the
// proxy is an optimistic check — not the authorization boundary (RLS is).
export default async function MembersHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-3 px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Members area</h1>
      <p className="text-muted">
        {user ? `Signed in as ${user.email}.` : "No active session (placeholder)."}
      </p>
    </main>
  );
}

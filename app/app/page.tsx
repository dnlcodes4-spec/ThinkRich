import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

// Protected landing. The proxy redirects unauthenticated users to /login before
// this renders; the page still reads the user + profile itself, because the proxy
// is an optimistic check, not the authorization boundary (RLS is). Reading the
// caller's own profile is allowed by the profiles_select policy (id = auth.uid()).
export default async function MembersHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {profile?.full_name ? `Welcome, ${profile.full_name}.` : "Members area"}
      </h1>
      <p className="text-sm text-muted">
        {user ? `Signed in as ${user.email}` : "No active session (placeholder)."}
        {profile?.role ? ` · role: ${profile.role}` : ""}
      </p>
      {user ? (
        <form action={signOut}>
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      ) : null}
    </main>
  );
}

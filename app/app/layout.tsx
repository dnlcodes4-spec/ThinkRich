import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/terms";
import { AppHeader } from "@/components/app-shell/app-header";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { navForRole } from "@/components/app-shell/nav";

// The app shell wraps every /app/* route: a desktop sidebar + mobile bottom bar
// driven by the caller's role, and a header with notifications + account menu.
// Nav destinations mirror RLS (a member never sees admin links) but are not the
// control; RLS is (ADR-0005). The proxy guarantees an authenticated user here.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const { count: unread } = user
    ? await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
    : { count: 0 };

  const items = navForRole(profile?.role);

  return (
    <div className="flex min-h-svh flex-1">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          name={profile?.full_name ?? ""}
          roleLabel={roleLabel(profile?.role)}
          email={user?.email ?? ""}
          unread={unread ?? 0}
        />
        {children}
        <BottomNav items={items} />
      </div>
    </div>
  );
}

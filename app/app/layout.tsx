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
      {/* The sidebar precedes the content in the DOM, so keyboard users get a
          way past it. Hidden until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          name={profile?.full_name ?? ""}
          roleLabel={roleLabel(profile?.role)}
          email={user?.email ?? ""}
          unread={unread ?? 0}
        />
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <BottomNav items={items} />
      </div>
    </div>
  );
}

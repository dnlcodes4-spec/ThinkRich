import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/terms";
import { AppHeader } from "@/components/app-shell/app-header";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { NavProgress } from "@/components/app-shell/nav-progress";
import { navForRole } from "@/components/app-shell/nav";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";
import { ChangePasswordPrompt } from "@/components/account/change-password-prompt";
import { needsPasswordChange } from "@/lib/must-change-password";
import { VinPrompt } from "@/components/account/vin-prompt";

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
    ? await supabase.from("profiles").select("role, full_name, vin_id").eq("id", user.id).maybeSingle()
    : { data: null };

  // A staff account (any non-member role) with no voter's card can't be `active`
  // (CR-0009), which silently blocks every RLS check gated on active status.
  // Prompt them to add it. Members carry their VIN on the member record instead.
  const needsVin = Boolean(profile && profile.role !== "member" && !profile.vin_id);

  const { count: unread } = user
    ? await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .is("read_at", null)
    : { count: 0 };

  const items = navForRole(profile?.role);

  return (
    // Think-Winners brand tokens (navy + gold, ADR-0008). Without this the whole
    // dashboard inherits the ThinkRich umbrella's ink + green from :root, which
    // is what it was doing after CR-0008 moved these screens to their own origin.
    <div data-brand="think-winners" className="flex min-h-svh flex-1">
      {/* Suspense: NavProgress reads useSearchParams, which otherwise opts the
          whole shell into client rendering. */}
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      {/* The sidebar precedes the content in the DOM, so keyboard users get a
          way past it. Hidden until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-primary focus:px-4 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar items={items} name={profile?.full_name ?? ""} roleLabel={roleLabel(profile?.role)} />
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
        {/* Still on the temporary password we generated: nudge them to pick one.
            Password first; the VIN prompt waits until that is dealt with so the
            two modals never stack. */}
        {needsPasswordChange(user?.app_metadata) ? (
          <ChangePasswordPrompt />
        ) : needsVin ? (
          <VinPrompt />
        ) : null}
      </div>
      {/* Scoped to the app shell, not the root layout: after the two-origin
          split (CR-0008) the root layout also renders the umbrella landing,
          which is not installable. */}
      <ServiceWorkerRegistrar />
    </div>
  );
}

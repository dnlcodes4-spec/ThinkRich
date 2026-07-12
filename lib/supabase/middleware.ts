import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// Route prefixes that require an authenticated user. Real login lands in T-003;
// this proves the proxy's authed/unauthed routing works end-to-end today.
const PROTECTED_PREFIXES = ["/app"];

// Refreshes the Supabase session on each request and applies optimistic
// auth redirects. Per Next 16 + Supabase guidance, the proxy is NOT the sole
// authorization control — RLS is. See docs/architecture/security-model.md.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between creating the client and getUser(): this call is what
  // refreshes the session cookies (Supabase SSR guidance).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

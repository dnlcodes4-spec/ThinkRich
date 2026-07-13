import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed `middleware` to `proxy`. Runs before routes render; here it
// refreshes the Supabase session and applies optimistic auth redirects.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and image files, so auth logic never
  // blocks CSS/JS/images (Next 16 proxy docs: use negative matching).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

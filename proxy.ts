import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { applyOriginSplit } from "@/lib/origin-split";

// Next 16 renamed `middleware` to `proxy`. Runs before routes render; here it
// routes the request to the right origin, then refreshes the Supabase session
// and applies optimistic auth redirects.
export async function proxy(request: NextRequest) {
  // The origin split runs first (CR-0008). Anything it handles is either a
  // redirect to the other origin or a rewrite onto the public marketing surface,
  // neither of which needs a session — and skipping the Supabase round trip on
  // public marketing hits is a saving, not a regression. Every authenticated
  // path (/app, /login) falls through to updateSession untouched.
  const split = applyOriginSplit(request);
  if (split) return split;

  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and image files, so auth logic never
  // blocks CSS/JS/images (Next 16 proxy docs: use negative matching).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";
import { originHosts, resolveOriginRoute } from "@/lib/origins";

// Response half of the two-origin split (CR-0008, ADR-0014). The routing table
// itself is `resolveOriginRoute` in lib/origins.ts, which is pure; this only
// turns its verdict into a NextResponse.
//
// Kept out of lib/origins.ts so client components can import the link helpers
// without pulling `next/server` into the browser bundle.

/**
 * Resolves a request against the split. Returns a redirect or rewrite when the
 * host demands one, or `null` meaning "not ours, carry on" — the answer whenever
 * the split is off, the host is unrecognised, or the path is an asset.
 */
export function applyOriginSplit(request: NextRequest): NextResponse | null {
  const route = resolveOriginRoute(
    request.nextUrl.pathname,
    request.headers.get("host"),
    originHosts(),
  );

  if (route.kind === "pass") return null;

  if (route.kind === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = route.pathname;
    // NextResponse.rewrite propagates the RSC headers Next needs; a hand-rolled
    // fetch would drop them (Next 16 proxy reference, "RSC requests and rewrites").
    return NextResponse.rewrite(url);
  }

  // Built from request.url so the query string survives the hop.
  const url = new URL(request.url);
  url.protocol = requestProtocol(request);
  // hostname + explicit port reset, NOT `url.host`: the WHATWG host setter keeps
  // whatever port is already there when the new value carries none, which would
  // emit https://thinkwinners.…:3000/app from a ported origin.
  url.hostname = route.host;
  url.port = "";
  url.pathname = route.pathname;
  // 307, deliberately. A permanent redirect would sit in browser caches long
  // after a rollback and keep sending users to an origin we had backed out of.
  // Promote to 308 once the split is proven in production (CR-0008 §6).
  return NextResponse.redirect(url, 307);
}

function requestProtocol(request: NextRequest): string {
  // Behind Vercel's TLS termination request.url is http; the real scheme is here.
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwarded ? `${forwarded}:` : request.nextUrl.protocol;
}

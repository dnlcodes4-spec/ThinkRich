import { env } from "@/lib/env";

// The two-origin split (CR-0008, ADR-0014).
//
//   thinkrichcommunity.com              → the ThinkRich Community umbrella landing, and only that
//   thinkwinners.thinkrichcommunity.com → the Think-Winners arm: its landing at the root,
//                                         plus /login and every /app dashboard
//
// One Next app serves both. Two pages cannot occupy `/` in the same route tree,
// so the Think-Winners landing stays at the `/think-winners` subtree on disk and
// the proxy mounts it at the root of its own origin. Everything here is pure so
// both the proxy and client components can share one definition of the split.
//
// This is addressing, NOT access control. Authorization is Postgres RLS
// (ADR-0005); never treat a hostname as a permission.

/** Where the Think-Winners marketing surface lives in the app directory. */
export const TW_ROOT = "/think-winners";

/**
 * Paths belonging to the Think-Winners platform rather than the umbrella
 * landing. Unlike the marketing surface these keep their real paths on the
 * subdomain — `/app` stays `/app` — so they are never rewritten, only redirected
 * off the apex.
 */
export const PLATFORM_PREFIXES = ["/app", "/login", "/gallery", "/dev"] as const;

export type Surface = "apex" | "think-winners";

export type OriginHosts = { apex: string; thinkWinners: string };

/**
 * The configured hosts, or `null` when the split is off. Off is a first-class
 * state, not a misconfiguration: local dev and preview deployments have no
 * subdomain, so they serve every surface from one origin exactly as before.
 */
export function originHosts(): OriginHosts | null {
  const apex = env.NEXT_PUBLIC_APEX_HOST?.trim().toLowerCase();
  const thinkWinners = env.NEXT_PUBLIC_THINK_WINNERS_HOST?.trim().toLowerCase();
  if (!apex || !thinkWinners) return null;
  return { apex, thinkWinners };
}

/** Which surface a Host header belongs to, or `null` for anything unrecognised. */
export function surfaceForHost(host: string | null | undefined, hosts: OriginHosts): Surface | null {
  if (!host) return null;
  // Host carries the port in dev (`localhost:3000`) and may carry a trailing dot.
  const bare = host.split(":")[0].trim().toLowerCase().replace(/\.$/, "");
  if (bare === hosts.thinkWinners) return "think-winners";
  if (bare === hosts.apex || bare === `www.${hosts.apex}`) return "apex";
  // A preview URL or an unknown alias: leave it unsplit and fully browsable,
  // otherwise every PR preview would redirect itself to production.
  return null;
}

export function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isThinkWinnersRoute(pathname: string): boolean {
  return pathname === TW_ROOT || pathname.startsWith(`${TW_ROOT}/`);
}

/**
 * Requests the split must not touch: framework internals, route handlers, and
 * anything with a file extension.
 *
 * The extension rule is load-bearing, not defensive. `public/think-winners/`
 * holds the apex landing's own hero images, so their URLs collide with the
 * `/think-winners` route subtree. Without this the apex would redirect its own
 * artwork to the subdomain.
 */
export function isPassThroughPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.slice(pathname.lastIndexOf("/")).includes(".")
  );
}

/**
 * What the split says to do with a request. Pure and fully determined by its
 * arguments, so the routing table can be tested without a server.
 *
 * - `pass`     — serve the path as-is on this origin
 * - `redirect` — it belongs to the other origin
 * - `rewrite`  — serve it from a different path on this origin
 */
export type OriginRoute =
  | { kind: "pass" }
  | { kind: "redirect"; host: string; pathname: string }
  | { kind: "rewrite"; pathname: string };

const PASS: OriginRoute = { kind: "pass" };

export function resolveOriginRoute(
  pathname: string,
  host: string | null | undefined,
  hosts: OriginHosts | null,
): OriginRoute {
  if (!hosts) return PASS;
  if (isPassThroughPath(pathname)) return PASS;

  const surface = surfaceForHost(host, hosts);
  if (!surface) return PASS;

  const toThinkWinners = (p: string): OriginRoute => ({
    kind: "redirect",
    host: hosts.thinkWinners,
    pathname: p,
  });

  if (surface === "apex") {
    // The umbrella front door, and nothing else. The Think-Winners subtree loses
    // its prefix on the way across: /think-winners/organization → /organization.
    if (isThinkWinnersRoute(pathname)) return toThinkWinners(stripTwRoot(pathname));
    if (isPlatformPath(pathname)) return toThinkWinners(pathname);
    return PASS;
  }

  // The Think-Winners origin. Platform paths keep their real paths and are
  // served straight through, so /app/* still reaches the proxy's auth handling.
  if (isPlatformPath(pathname)) return PASS;

  // The subtree is mounted at this origin's root, so its prefixed URLs are
  // duplicates of the canonical ones. Send them to the canonical form.
  if (isThinkWinnersRoute(pathname)) return toThinkWinners(stripTwRoot(pathname));

  // Everything else here is the marketing surface: mount it at the root.
  return { kind: "rewrite", pathname: pathname === "/" ? TW_ROOT : `${TW_ROOT}${pathname}` };
}

function stripTwRoot(pathname: string): string {
  return pathname.slice(TW_ROOT.length) || "/";
}

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * A link to the Think-Winners origin. Pass the path as it exists *there*:
 * `/` for its landing, `/login`, `/app/vote`.
 *
 * With the split on this is an absolute cross-origin URL. With it off the
 * result folds back onto one origin, mirroring exactly what the proxy's rewrite
 * does in the other direction — marketing paths gain the `/think-winners`
 * prefix, platform paths keep theirs.
 */
export function thinkWinnersHref(
  path: string = "/",
  hosts: OriginHosts | null = originHosts(),
): string {
  const p = normalizePath(path);
  if (hosts) return `https://${hosts.thinkWinners}${p}`;
  if (isPlatformPath(p)) return p;
  return p === "/" ? TW_ROOT : `${TW_ROOT}${p}`;
}

/** A link back to the umbrella origin. Relative when the split is off. */
export function apexHref(
  path: string = "/",
  hosts: OriginHosts | null = originHosts(),
): string {
  const p = normalizePath(path);
  return hosts ? `https://${hosts.apex}${p}` : p;
}

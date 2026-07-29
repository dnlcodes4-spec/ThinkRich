import { describe, it, expect } from "vitest";
import {
  apexHref,
  isPassThroughPath,
  resolveOriginRoute,
  thinkWinnersHref,
  type OriginHosts,
} from "./origins";

// The two-origin split's routing table (CR-0008, ADR-0014).
const HOSTS: OriginHosts = {
  apex: "thinkrichcommunity.com",
  thinkWinners: "thinkwinners.thinkrichcommunity.com",
};

const APEX = "thinkrichcommunity.com";
const TW = "thinkwinners.thinkrichcommunity.com";

describe("resolveOriginRoute — split disabled", () => {
  // Local dev and Vercel previews have no subdomain. Everything must stay
  // reachable on one origin, and this is also the rollback switch (CR-0008 §6).
  it.each(["/", "/app", "/app/vote", "/login", "/think-winners", "/think-winners/organization"])(
    "passes %s straight through when no hosts are configured",
    (pathname) => {
      expect(resolveOriginRoute(pathname, "localhost:3000", null)).toEqual({ kind: "pass" });
    },
  );
});

describe("resolveOriginRoute — apex origin", () => {
  it("serves the umbrella landing", () => {
    expect(resolveOriginRoute("/", APEX, HOSTS)).toEqual({ kind: "pass" });
  });

  it.each(["/app", "/app/vote", "/app/admin/team", "/login", "/gallery", "/dev/national-admins"])(
    "sends the platform path %s to the Think-Winners origin",
    (pathname) => {
      expect(resolveOriginRoute(pathname, APEX, HOSTS)).toEqual({
        kind: "redirect",
        host: TW,
        pathname,
      });
    },
  );

  it("strips the /think-winners prefix when redirecting the marketing surface", () => {
    expect(resolveOriginRoute("/think-winners", APEX, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/",
    });
    expect(resolveOriginRoute("/think-winners/organization", APEX, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/organization",
    });
  });

  it("treats www as the apex", () => {
    expect(resolveOriginRoute("/app", `www.${APEX}`, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/app",
    });
  });

  it("ignores the port and a trailing dot on the Host header", () => {
    expect(resolveOriginRoute("/", `${APEX}:443`, HOSTS)).toEqual({ kind: "pass" });
    expect(resolveOriginRoute("/app", `${APEX}.`, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/app",
    });
  });

  // public/think-winners/ holds the apex landing's OWN hero images, so their
  // URLs collide with the /think-winners route subtree. Redirecting them would
  // strip the artwork off the umbrella landing.
  it("leaves the apex landing's own assets under /think-winners alone", () => {
    expect(resolveOriginRoute("/think-winners/img/hero-v2.jpeg", APEX, HOSTS)).toEqual({
      kind: "pass",
    });
    expect(resolveOriginRoute("/think-winners/logo-mark-light.png", APEX, HOSTS)).toEqual({
      kind: "pass",
    });
  });
});

describe("resolveOriginRoute — Think-Winners origin", () => {
  it("mounts the marketing surface at the root", () => {
    expect(resolveOriginRoute("/", TW, HOSTS)).toEqual({
      kind: "rewrite",
      pathname: "/think-winners",
    });
    expect(resolveOriginRoute("/organization", TW, HOSTS)).toEqual({
      kind: "rewrite",
      pathname: "/think-winners/organization",
    });
  });

  it.each(["/app", "/app/vote", "/login", "/gallery"])(
    "serves the platform path %s unchanged",
    (pathname) => {
      expect(resolveOriginRoute(pathname, TW, HOSTS)).toEqual({ kind: "pass" });
    },
  );

  it("canonicalises the prefixed URLs away, so each page has one address", () => {
    expect(resolveOriginRoute("/think-winners", TW, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/",
    });
    expect(resolveOriginRoute("/think-winners/organization", TW, HOSTS)).toEqual({
      kind: "redirect",
      host: TW,
      pathname: "/organization",
    });
  });
});

describe("resolveOriginRoute — unrecognised hosts", () => {
  // Otherwise every PR preview would redirect itself into production.
  it.each(["thinkrich-git-feat-x.vercel.app", "localhost:3000", null, undefined])(
    "leaves %s unsplit",
    (host) => {
      expect(resolveOriginRoute("/app", host, HOSTS)).toEqual({ kind: "pass" });
      expect(resolveOriginRoute("/think-winners", host, HOSTS)).toEqual({ kind: "pass" });
    },
  );
});

describe("isPassThroughPath", () => {
  it.each(["/_next/static/chunk.js", "/api/health", "/sw.js", "/manifest.webmanifest", "/a/b.png"])(
    "passes %s through",
    (pathname) => {
      expect(isPassThroughPath(pathname)).toBe(true);
    },
  );

  it.each(["/", "/app", "/think-winners", "/app/admin/new-account"])(
    "does not treat the route %s as an asset",
    (pathname) => {
      expect(isPassThroughPath(pathname)).toBe(false);
    },
  );

  // A dot in a parent segment must not disguise a route as an asset.
  it("only inspects the last segment for an extension", () => {
    expect(isPassThroughPath("/v1.2/app")).toBe(false);
  });
});

describe("link helpers", () => {
  it("build absolute cross-origin URLs when the split is on", () => {
    expect(thinkWinnersHref("/", HOSTS)).toBe(`https://${TW}/`);
    expect(thinkWinnersHref("/login", HOSTS)).toBe(`https://${TW}/login`);
    expect(apexHref("/", HOSTS)).toBe(`https://${APEX}/`);
  });

  // With the split off the helpers must fold back onto one origin, mirroring
  // the proxy's rewrite exactly: marketing paths gain the prefix, platform
  // paths keep theirs.
  it("fold back onto one origin when the split is off", () => {
    expect(thinkWinnersHref("/", null)).toBe("/think-winners");
    expect(thinkWinnersHref("/organization", null)).toBe("/think-winners/organization");
    expect(thinkWinnersHref("/login", null)).toBe("/login");
    expect(thinkWinnersHref("/app/vote", null)).toBe("/app/vote");
    expect(apexHref("/", null)).toBe("/");
  });

  it("is the inverse of the proxy rewrite for marketing paths", () => {
    const route = resolveOriginRoute("/organization", TW, HOSTS);
    expect(route).toEqual({ kind: "rewrite", pathname: thinkWinnersHref("/organization", null) });
  });
});

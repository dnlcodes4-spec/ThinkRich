import type { MetadataRoute } from "next";

// PWA manifest (ADR-0004). Served at /manifest.webmanifest and auto-linked by Next.
// The members' app installs to the home screen with no app store; icons + colours
// come from the ThinkRich (black) brand.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ThinkRich Community",
    short_name: "ThinkRich",
    description:
      "The ThinkRich Community members' app: your membership, candidates, and updates.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

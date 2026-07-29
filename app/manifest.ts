import type { MetadataRoute } from "next";

// PWA manifest (ADR-0004, rescoped by CR-0008). Served at /manifest.webmanifest
// and auto-linked by Next.
//
// The installable app is the Think-Winners members' app, which lives on the
// Think-Winners origin under /app. It is NOT the ThinkRich umbrella landing, so
// scope is /app rather than the whole origin: the apex is a marketing site with
// nothing to install. That narrowing, plus a registrar that now mounts only
// inside the app shell, is what keeps the two surfaces apart.
//
// Colours follow the Think-Winners navy (ADR-0008) rather than the ThinkRich
// black (ADR-0010), because navy is what the installed app opens into.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Think-Winners Movement",
    short_name: "Think-Winners",
    description:
      "The Think-Winners members' app: your membership, your candidates, and updates from the movement.",
    start_url: "/app",
    scope: "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#051527",
    theme_color: "#051527",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}

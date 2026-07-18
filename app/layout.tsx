import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker-registrar";

// Body — Hanken Grotesk: warm, humanist, highly legible. Replaces Geist (the
// create-next-app default that reads as a templated/AI build).
const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Display — Zodiak (Fontshare, self-hosted): a distinctive contemporary serif
// for headlines; the ThinkRich Community voice. Variable weight + true italic
// (carries the gold display accents). Less ubiquitous than a Google serif =
// more one-of-a-kind. Licence: app/fonts/zodiak/LICENSE.txt.
const display = localFont({
  variable: "--font-zodiak",
  display: "swap",
  src: [
    { path: "./fonts/zodiak/Zodiak-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/zodiak/Zodiak-VariableItalic.woff2", weight: "100 900", style: "italic" },
  ],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ThinkRich Community: Creating Value for Mankind",
  description:
    "A value-driven community building leaders who connect the right people to verifiable opportunities. Six arms, one purpose: creating value for mankind.",
  applicationName: "ThinkRich Community",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ThinkRich" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

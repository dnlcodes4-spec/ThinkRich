import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

// Display serif — echoes the italic-serif tagline in the movement's own logo,
// so it's brand-grounded, not decorative. Scoped to the marketing surface.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Think-Winners Movement: Thinking Together, Winning Together",
  description:
    "A grassroots mobilization engine for campaigns: an organized, data-driven network of trained community leaders reaching engaged voters across Nigeria through education, engagement, and lawful participation. Partner with us.",
};

// The Think-Winners surface keeps its display serif (grounded in the movement's
// logo) — it overrides the site-default display face (Zodiak) for its subtree.
export default function ThinkWinnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-brand="think-winners"
      className={display.variable}
      style={{ "--font-display-face": "var(--font-fraunces)" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

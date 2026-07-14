import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { ThinkWinnersNav } from "@/components/marketing/nav";

// Display serif — echoes the italic-serif tagline in the movement's own logo,
// so it's brand-grounded, not decorative. Scoped to the marketing surface.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "Think-Winners Movement — Thinking Together, Winning Together",
  description:
    "A grassroots mobilization engine for campaigns: an organized, data-driven network of trained community leaders reaching engaged voters across Nigeria through education, engagement, and lawful participation. Partner with us.",
};

// The whole Think-Winners surface renders in the green brand + display serif.
export default function ThinkWinnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-brand="think-winners" className={display.variable}>
      <ThinkWinnersNav />
      {children}
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in to ThinkRich",
  robots: { index: false, follow: false },
};

// Provisioned accounts only (ADR-0011): email + password sign-in, no public
// sign-up. Members are registered by their leader. Split layout: brand panel
// (left) + form (right); stacks to a single column on mobile.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh flex-1 flex-col lg:flex-row">
      <aside className="relative isolate flex min-h-[34svh] flex-col justify-between overflow-hidden bg-ink-250 px-6 py-8 text-white lg:min-h-0 lg:w-[45%] lg:px-12 lg:py-14">
        <Image
          src="/thinkrich/img/hero-grassroots.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-250/40 via-ink-950/75 to-ink-250" />

        <div className="inline-flex w-fit self-start rounded-2xl bg-white p-2 shadow-sm">
          <Image
            src="/logos/ThinkrichCommunity_transparent.png"
            alt="ThinkRich Community"
            width={1072}
            height={1072}
            className="size-14 sm:size-16"
          />
        </div>

        <div className="mt-8 lg:mt-0">
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight lg:text-[2.75rem]">
            One movement.
            <br />
            Every ward<span className="text-accent">.</span>
          </p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Building leaders who connect the right people to verifiable
            opportunities.
          </p>
        </div>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-navy-800 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <p className="font-display text-lg font-semibold tracking-tight text-white">
              Think-Winners Movement
            </p>
            <div className="mt-1.5 h-0.5 w-9 rounded-full bg-gold-500" />
          </div>
          <div className="rounded-card border border-border bg-surface p-6 shadow-lg sm:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted">
              Sign in to your account. Accounts are set up by your leader or
              coordinator, so there is no public sign-up.
            </p>
            <div className="mt-6">
              <LoginForm next={next} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

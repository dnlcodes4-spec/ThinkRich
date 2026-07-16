import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in to ThinkRich",
  robots: { index: false, follow: false },
};

// Provisioned accounts only (ADR-0011): email + password sign-in, no public
// sign-up. Members are registered by their leader.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted">
          Accounts are provisioned by an administrator or your leader. There is no public sign-up.
        </p>
      </div>
      <LoginForm next={next} />
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { signIn, type SignInState } from "./actions";

const initial: SignInState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="current-password"
        required
      />
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="w-full">
        Sign in
      </Button>
    </form>
  );
}

"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "./input";

type Props = Omit<ComponentProps<typeof Input>, "type" | "trailing">;

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.75" />
      {off ? <path d="m4 20 16-16" /> : null}
    </svg>
  );
}

/**
 * Password field with a reveal toggle. The button is a real control (keyboard
 * reachable, labelled for screen readers) and never submits the form.
 */
export function PasswordInput(props: Props) {
  const [shown, setShown] = useState(false);

  return (
    <Input
      {...props}
      type={shown ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="grid size-10 place-items-center rounded-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <EyeIcon off={shown} />
        </button>
      }
    />
  );
}

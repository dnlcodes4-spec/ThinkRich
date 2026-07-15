"use client";

import { useActionState } from "react";
import {
  requestPartnership,
  type PartnershipState,
} from "@/app/think-winners/actions";

const initial: PartnershipState = { status: "idle" };

const inputCls =
  "mt-1.5 w-full rounded-md border border-navy-200 bg-white px-3.5 py-2.5 text-navy-950 placeholder:text-navy-900/35 focus:border-gold-500 focus:outline-2 focus:outline-offset-1 focus:outline-gold-400";

function Field({
  label,
  name,
  type = "text",
  required = false,
  textarea = false,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-navy-800">
        {label}
        {required && <span className="text-gold-600"> *</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={4}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={inputCls}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className={`${inputCls} min-h-11`}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function PartnershipForm() {
  const [state, formAction, pending] = useActionState(
    requestPartnership,
    initial,
  );
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-navy-200 bg-white p-8 text-center sm:p-10">
        <div
          aria-hidden="true"
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-navy-700 text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="mt-5 font-display text-2xl font-semibold text-navy-950">
          Request received.
        </p>
        <p className="mx-auto mt-2 max-w-sm text-navy-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="rounded-2xl border border-navy-200 bg-white p-6 sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" required autoComplete="name" placeholder="Full name" error={fe.name} />
        <Field label="Campaign / organization" name="organization" required placeholder="e.g. the campaign name" error={fe.organization} />
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" error={fe.email} />
        <Field label="Phone" name="phone" type="tel" autoComplete="tel" placeholder="Optional" error={fe.phone} />
      </div>
      <div className="mt-5">
        <Field label="Your role" name="role" placeholder="Optional, e.g. Campaign Director" error={fe.role} />
      </div>
      <div className="mt-5">
        <Field label="How can we help your campaign?" name="message" textarea required placeholder="Tell us about your campaign and where you need grassroots support." error={fe.message} />
      </div>

      {state.status === "error" && state.message && (
        <p className="mt-4 text-sm font-medium text-red-600">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gold-500 px-7 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Request a partnership"}
      </button>
    </form>
  );
}

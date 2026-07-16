"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertCandidate, deleteCandidate, type CandidateState } from "./actions";

const initial: CandidateState = { status: "idle" };

type Defaults = {
  exists: boolean;
  full_name: string;
  party: string;
  running_mate: string;
  slogan: string;
};

export function CandidateForm({ defaults, photoUrl }: { defaults: Defaults; photoUrl: string | null }) {
  const [state, action, pending] = useActionState(upsertCandidate, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};
  const shown = preview ?? photoUrl;

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="aspect-3/4 w-28 shrink-0 overflow-hidden rounded-card border border-border bg-surface-muted">
            {shown ? (
              // Public bucket URL; next/image isn't a fit for user-managed content.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shown} alt="Candidate" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                No photo
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">Photo</span>
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
              className="block text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-border"
            />
            {fe.photo ? <span className="text-xs text-danger">{fe.photo}</span> : null}
          </label>
        </div>

        <Input label="Full name" name="full_name" defaultValue={defaults.full_name} required error={fe.full_name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Party" name="party" defaultValue={defaults.party} error={fe.party} />
          <Input label="Running mate" name="running_mate" defaultValue={defaults.running_mate} error={fe.running_mate} />
        </div>
        <Input label="Slogan" name="slogan" defaultValue={defaults.slogan} hint="A short campaign line (optional)" error={fe.slogan} />

        {state.status === "error" && state.message ? (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        ) : null}
        {state.status === "success" ? <p className="text-sm text-accent">Candidate saved.</p> : null}

        <Button type="submit" loading={pending} className="sm:self-start">
          {defaults.exists ? "Save changes" : "Publish candidate"}
        </Button>
      </form>

      {defaults.exists ? (
        <form action={deleteCandidate}>
          <Button type="submit" variant="destructive" size="sm">
            Remove candidate
          </Button>
        </form>
      ) : null}
    </div>
  );
}

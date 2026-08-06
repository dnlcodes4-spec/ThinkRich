"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { saveCandidacy, type CandidacyState } from "./actions";

const initial: CandidacyState = { status: "idle" };

export type FormOption = { id: string; label: string };

export type CandidateFormProps = {
  officeTypeId: string;
  officeTitle: string;
  hasRunningMate: boolean;
  runningMateTitle: string | null;
  geoId: string | null;
  whereLabel: string;
  elections: FormOption[];
  parties: FormOption[];
  existing: {
    id: string;
    full_name: string;
    running_mate_name: string | null;
    party_id: string | null;
    slogan: string | null;
    bio: string | null;
    is_endorsed: boolean;
    is_published: boolean;
  } | null;
  photoUrl: string | null;
};

export function CandidateForm(props: CandidateFormProps) {
  const { officeTypeId, officeTitle, hasRunningMate, runningMateTitle, geoId, whereLabel, elections, parties, existing, photoUrl } = props;
  const [state, action, pending] = useActionState(saveCandidacy, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const fe = state.fieldErrors ?? {};
  const shown = preview ?? photoUrl;
  const formError = state.status === "error" ? state.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="office_type_id" value={officeTypeId} />
      {geoId ? <input type="hidden" name="geo_id" value={geoId} /> : null}
      {existing ? <input type="hidden" name="id" value={existing.id} /> : null}

      <p className="text-sm text-muted">
        <span className="font-semibold text-foreground">{officeTitle}</span> for {whereLabel}
      </p>

      <Select label="Election" name="election_id" required defaultValue={elections[0]?.id ?? ""} error={fe.election_id}>
        {elections.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </Select>

      <div className="flex items-start gap-4">
        <div className="aspect-3/4 w-28 shrink-0 overflow-hidden rounded-card border border-border bg-surface-muted">
          {shown ? (
            // Public bucket URL; next/image isn't a fit for user-managed content.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Candidate" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">No photo</div>
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
          <span className="text-xs text-muted">JPEG, PNG or WebP, up to 5 MB. Optional.</span>
          {fe.photo ? <span className="text-xs text-danger">{fe.photo}</span> : null}
        </label>
      </div>

      <Input label="Full name" name="full_name" defaultValue={existing?.full_name ?? ""} required error={fe.full_name} />

      {hasRunningMate ? (
        <Input
          label={runningMateTitle ?? "Running mate"}
          name="running_mate_name"
          defaultValue={existing?.running_mate_name ?? ""}
          hint="Elected on the same ticket, never separately"
          error={fe.running_mate_name}
        />
      ) : null}

      <Select label="Party" name="party_id" defaultValue={existing?.party_id ?? ""}>
        <option value="">No party listed</option>
        {parties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>

      <Input label="Slogan" name="slogan" defaultValue={existing?.slogan ?? ""} hint="A short campaign line (optional)" error={fe.slogan} />

      <fieldset className="flex flex-col gap-3 rounded-card border border-border p-4">
        <legend className="px-1 text-xs font-semibold text-muted">Before voters can see this</legend>
        <label className="flex items-start gap-2.5 text-sm text-foreground">
          <input type="checkbox" name="is_endorsed" defaultChecked={existing?.is_endorsed ?? false} className="mt-0.5 size-4 shrink-0" />
          <span>
            This is the movement&apos;s candidate
            <span className="block text-xs text-muted">Marks them as the one to back where a seat has more than one.</span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-foreground">
          <input type="checkbox" name="is_published" defaultChecked={existing?.is_published ?? false} className="mt-0.5 size-4 shrink-0" />
          <span>
            Visible to members
            <span className="block text-xs text-muted">Leave off to save a draft voters can&apos;t see yet.</span>
          </span>
        </label>
      </fieldset>

      <FormError message={formError} />
      {state.status === "success" ? (
        <p className="flex items-center gap-1.5 rounded-sm border border-success/30 bg-success-soft px-3 py-2 text-sm text-foreground">
          <span aria-hidden="true" className="text-success">✓</span>
          Candidate saved.
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="sm:self-start">
        {existing ? "Save changes" : "Add candidate"}
      </Button>
    </form>
  );
}

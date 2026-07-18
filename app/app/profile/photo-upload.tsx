"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { uploadPhoto, type PhotoState } from "./actions";

const initial: PhotoState = { status: "idle" };

export function PhotoUpload({ currentUrl }: { currentUrl: string | null }) {
  // Remount to reset the form + action state after a successful upload.
  const [instance, setInstance] = useState(0);
  return <Inner key={instance} currentUrl={currentUrl} onReset={() => setInstance((i) => i + 1)} />;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="aspect-3/4 w-40 overflow-hidden rounded-card border border-border bg-surface-muted">
      {children}
    </div>
  );
}

function Inner({ currentUrl, onReset }: { currentUrl: string | null; onReset: () => void }) {
  const [state, action, pending] = useActionState(uploadPhoto, initial);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === "success") toast("Photo updated.", "success");
  }, [state, toast]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <Frame>
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="Passport photo" className="h-full w-full object-cover" />
          ) : null}
        </Frame>
        <p className="text-xs text-accent">Photo updated.</p>
        <Button variant="secondary" onClick={onReset} className="w-40">
          Replace photo
        </Button>
      </div>
    );
  }

  const shown = preview ?? currentUrl;

  return (
    <form action={action} className="flex flex-col gap-3">
      <Frame>
        {shown ? (
          // Signed, short-lived URL from a private bucket; next/image isn't a fit here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Passport photo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
            No photo yet
          </div>
        )}
      </Frame>

      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
        className="block w-40 text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-border"
      />

      {state.status === "error" && state.message ? (
        <p className="text-xs text-danger">{state.message}</p>
      ) : null}

      <Button type="submit" loading={pending} disabled={!preview} className="w-40">
        Save photo
      </Button>
    </form>
  );
}

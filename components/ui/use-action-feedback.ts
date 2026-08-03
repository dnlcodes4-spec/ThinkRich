"use client";

import { useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { useToast } from "./toast";

// The one place the "toast on success, inline on error" rule lives. Consumers pass
// their useActionState result; this fires the success toast exactly once per
// transition into success (unless the form shows a one-time artifact, which keeps
// its own persistent block), and hands back the form-level error to render in a
// <FormError />. Centralising it here keeps the success-toast effect in a single
// reviewed location instead of being re-hand-rolled per form.
export function useActionFeedback(
  state: ActionState,
  options?: { successMessage?: string; artifact?: boolean },
): { error?: string } {
  const { toast } = useToast();
  const lastStatus = useRef(state.status);
  const successMessage = options?.successMessage ?? "Saved.";
  const artifact = options?.artifact ?? false;

  useEffect(() => {
    if (state.status === "success" && lastStatus.current !== "success" && !artifact) {
      toast(state.message ?? successMessage, "success");
    }
    lastStatus.current = state.status;
  }, [state, artifact, successMessage, toast]);

  return { error: state.status === "error" ? state.message : undefined };
}

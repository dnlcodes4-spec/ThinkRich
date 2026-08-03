import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useActionFeedback } from "./use-action-feedback";
import type { ActionState } from "@/lib/action-state";

const toast = vi.fn();
vi.mock("./toast", () => ({ useToast: () => ({ toast }) }));

function Harness({ state, artifact }: { state: ActionState; artifact?: boolean }) {
  const { error } = useActionFeedback(state, { successMessage: "Saved.", artifact });
  return <span>{error ?? "no-error"}</span>;
}

describe("useActionFeedback", () => {
  it("fires a success toast on transition to success", () => {
    toast.mockClear();
    const { rerender } = render(<Harness state={{ status: "idle" }} />);
    expect(toast).not.toHaveBeenCalled();
    rerender(<Harness state={{ status: "success" }} />);
    expect(toast).toHaveBeenCalledWith("Saved.", "success");
  });
  it("suppresses the toast for artifact forms", () => {
    toast.mockClear();
    const { rerender } = render(<Harness state={{ status: "idle" }} artifact />);
    rerender(<Harness state={{ status: "success" }} artifact />);
    expect(toast).not.toHaveBeenCalled();
  });
  it("returns the form-level error message", () => {
    const { getByText } = render(<Harness state={{ status: "error", message: "Nope." }} />);
    expect(getByText("Nope.")).toBeInTheDocument();
  });
});

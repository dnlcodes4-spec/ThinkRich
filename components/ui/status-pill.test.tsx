import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("renders the human label for each status", () => {
    const { rerender } = render(<StatusPill status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
    // Plain-language labels: frozen reads as "Paused" for members (see lib/terms).
    rerender(<StatusPill status="frozen" />);
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("conveys status with text, not colour alone (a visible label is always present)", () => {
    render(<StatusPill status="rejected" />);
    // The accessible name includes the word — a colour-blind or SR user still gets it.
    expect(screen.getByText("Declined")).toBeVisible();
  });
});

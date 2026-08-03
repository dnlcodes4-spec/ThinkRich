import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows the title and description", () => {
    render(<EmptyState title="No members yet" description="Register the first one." />);
    expect(screen.getByText("No members yet")).toBeInTheDocument();
    expect(screen.getByText("Register the first one.")).toBeInTheDocument();
  });
  it("renders an optional action", () => {
    render(<EmptyState title="No members yet" action={<button>Register</button>} />);
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });
});

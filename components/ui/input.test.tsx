import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("associates the label with the input", () => {
    render(<Input label="Phone" />);
    // getByLabelText only resolves if label↔input wiring is correct.
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
  });

  it("links a hint via aria-describedby when there is no error", () => {
    render(<Input label="Phone" hint="11 digits" />);
    const input = screen.getByLabelText("Phone");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(document.getElementById(describedBy as string)).toHaveTextContent("11 digits");
  });

  it("marks the field invalid and describes the error", () => {
    render(<Input label="Phone" hint="11 digits" error="Enter a valid number" />);
    const input = screen.getByLabelText("Phone");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      "Enter a valid number",
    );
    // The hint is hidden once there's an error (avoids a dangling aria reference).
    expect(screen.queryByText("11 digits")).not.toBeInTheDocument();
  });
});

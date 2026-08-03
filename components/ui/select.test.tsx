import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Select } from "./select";

describe("Select", () => {
  it("associates the label with the control", () => {
    render(
      <Select label="State">
        <option>Ogun</option>
      </Select>,
    );
    expect(screen.getByLabelText("State")).toBeInTheDocument();
  });
  it("marks invalid and describes the error", () => {
    render(
      <Select label="State" error="Required">
        <option>Ogun</option>
      </Select>,
    );
    const el = screen.getByLabelText("State");
    expect(el).toHaveAttribute("aria-invalid", "true");
    const id = el.getAttribute("aria-describedby");
    expect(document.getElementById(id as string)).toHaveTextContent("Required");
  });
});

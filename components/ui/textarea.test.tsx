import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("associates the label with the control", () => {
    render(<Textarea label="Reason" />);
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
  });
  it("marks invalid and describes the error", () => {
    render(<Textarea label="Reason" error="Too long" />);
    const el = screen.getByLabelText("Reason");
    expect(el).toHaveAttribute("aria-invalid", "true");
    const id = el.getAttribute("aria-describedby");
    expect(document.getElementById(id as string)).toHaveTextContent("Too long");
  });
});

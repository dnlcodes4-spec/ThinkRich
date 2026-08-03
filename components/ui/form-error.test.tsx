import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormError } from "./form-error";

describe("FormError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<FormError />);
    expect(container).toBeEmptyDOMElement();
  });
  it("announces the error via role=alert", () => {
    render(<FormError message="Could not save." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
  });
});

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonList, SkeletonTable, SkeletonForm } from "./skeleton";

describe("skeleton variants", () => {
  it("SkeletonList renders the requested number of rows", () => {
    const { container } = render(<SkeletonList rows={3} />);
    expect(container.querySelectorAll("[data-skel-row]").length).toBe(3);
  });
  it("SkeletonTable renders rows x cols cells", () => {
    const { container } = render(<SkeletonTable rows={2} cols={4} />);
    expect(container.querySelectorAll("[data-skel-cell]").length).toBe(8);
  });
  it("SkeletonForm renders the requested number of fields", () => {
    const { container } = render(<SkeletonForm fields={5} />);
    expect(container.querySelectorAll("[data-skel-field]").length).toBe(5);
  });
});

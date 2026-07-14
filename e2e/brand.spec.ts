import { test, expect } from "@playwright/test";

// Single navy + gold brand (ADR-0008): the per-brand `data-brand` override was removed,
// so the primary colour renders navy. Gold remains the shared accent.
test("primary renders the navy brand", async ({ page }) => {
  await page.goto("/gallery");
  const bg = await page
    .getByRole("button", { name: "Primary action" })
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(10, 42, 78)"); // navy-700
});

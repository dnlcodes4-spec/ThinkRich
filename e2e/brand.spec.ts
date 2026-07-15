import { test, expect } from "@playwright/test";

// ThinkRich umbrella is black + gold (ADR-0010, amending ADR-0008): the semantic `--primary`
// resolves to the near-black `ink-700`. Think-Winners keeps navy (see think-winners.spec).
test("primary renders the black (ink) brand", async ({ page }) => {
  await page.goto("/gallery");
  const bg = await page
    .getByRole("button", { name: "Primary action" })
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(30, 30, 33)"); // ink-700
});

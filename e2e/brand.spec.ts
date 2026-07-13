import { test, expect } from "@playwright/test";

// Proves the dual-brand `data-brand` switch actually changes the rendered
// primary colour (ThinkRich navy vs Think-Winners green), with gold shared.
test("data-brand changes the primary colour", async ({ page }) => {
  await page.goto("/");

  const navyBtn = page
    .locator('[data-brand="thinkrich"]')
    .getByRole("button", { name: "Primary action" });
  const greenBtn = page
    .locator('[data-brand="think-winners"]')
    .getByRole("button", { name: "Primary action" });

  const navyBg = await navyBtn.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  const greenBg = await greenBtn.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );

  expect(navyBg).not.toBe(greenBg);
  expect(navyBg).toBe("rgb(10, 42, 78)"); // navy-700
  expect(greenBg).toBe("rgb(21, 96, 46)"); // green-700
});

import { test, expect } from "@playwright/test";

test("think-winners landing renders and uses the green brand", async ({ page }) => {
  await page.goto("/think-winners");

  await expect(
    page.getByRole("heading", { level: 1, name: /winning together/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /what we bring to your campaign/i }),
  ).toBeVisible();
  // Candidate-first primary CTA (the landing pitches campaigns to partner).
  await expect(
    page.getByRole("link", { name: /partner with us/i }).first(),
  ).toBeVisible();

  // The whole surface renders in the Think-Winners (green) brand.
  await expect(page.locator('[data-brand="think-winners"]')).toBeVisible();
});

test("think-winners is publicly reachable (not gated by the proxy)", async ({
  page,
}) => {
  const res = await page.goto("/think-winners");
  expect(res?.status()).toBe(200);
});

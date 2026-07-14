import { test, expect } from "@playwright/test";

test("root is the ThinkRich Community landing", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /creating value/i }),
  ).toBeVisible();
  // The one live arm is reachable from the umbrella.
  await expect(
    page.getByRole("link", { name: /enter think-winners/i }).first(),
  ).toBeVisible();
});

test("gallery renders the primitives", async ({ page }) => {
  await page.goto("/gallery");
  await expect(
    page.getByRole("heading", { name: "Think-Winners Movement" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
});

test("theme toggle flips the document theme", async ({ page }) => {
  await page.goto("/gallery");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page
    .getByRole("button", { name: /switch to (light|dark) theme/i })
    .click();
  const after = await html.getAttribute("data-theme");
  expect(after).not.toBe(before);
  expect(["light", "dark"]).toContain(after);
});

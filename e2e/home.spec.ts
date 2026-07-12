import { test, expect } from "@playwright/test";

test("home gallery renders the brand and primitives", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Think-Winners Movement" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
});

test("theme toggle flips the document theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const before = await html.getAttribute("data-theme");
  await page
    .getByRole("button", { name: /switch to (light|dark) theme/i })
    .click();
  const after = await html.getAttribute("data-theme");
  expect(after).not.toBe(before);
  expect(["light", "dark"]).toContain(after);
});

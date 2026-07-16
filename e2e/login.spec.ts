import { test, expect } from "@playwright/test";

// Email + password sign-in (ADR-0011). These run without a seeded account: they
// verify the form wiring and the real Server Action -> signInWithPassword ->
// error path. The authenticated happy path needs a provisioned user (service-role
// key), covered separately.

test("login page shows the email + password form", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("invalid credentials show a generic error and stay on /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "nobody@example.com");
  await page.fill('input[name="password"]', "wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/login");
});

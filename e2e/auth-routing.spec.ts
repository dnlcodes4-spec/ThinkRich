import { test, expect } from "@playwright/test";

// Proves the proxy's authed/unauthed routing works: an unauthenticated request
// to a protected route is redirected to /login (carrying the intended path).
test("unauthenticated visit to a protected route redirects to /login", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("public routes are reachable without a session", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

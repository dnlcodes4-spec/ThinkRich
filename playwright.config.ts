import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. Specs live in ./e2e (*.spec.ts). Playwright starts the app
// itself via `webServer`. In CI, browsers are installed with
// `npx playwright install --with-deps chromium`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    // Dedicated port so E2E never collides with another local dev server.
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

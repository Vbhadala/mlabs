import { defineConfig, devices } from "@playwright/test"

// E2E config — runs against a Next.js dev server spun up by Playwright.
// Uses SKIP_ENV_VALIDATION=1 because most env vars are stubbed until W2-W4 wire them.
//
// Add browsers (firefox, webkit) here once we need them; chromium-only for now to
// keep CI minutes low.

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "SKIP_ENV_VALIDATION=1 pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})

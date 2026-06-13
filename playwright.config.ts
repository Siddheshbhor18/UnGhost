import { defineConfig, devices } from "@playwright/test";

// Dedicated E2E port — deliberately NOT 3000. Port 3000 is the Next default and
// routinely hosts an unrelated project; pointing the suite there once made it
// silently test the wrong app (7 phantom failures). Override PLAYWRIGHT_BASE_URL
// to reuse a server you already have running (e.g. http://localhost:3009) — that
// skips the auto-start entirely and avoids a second dev server sharing `.next`.
const PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Seeds the demo accounts the auth specs need (idempotent, non-destructive)
  // and asserts the target really is unGhost before any test runs.
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Generous because the dev server compiles routes on first hit (Turbopack),
    // so the first navigation to a page can be slow on a cold server.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only auto-start a server when the caller hasn't pointed us at one.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- -p ${PORT}`,
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});

import { expect, test, type Page } from "@playwright/test";

/**
 * "Go Premium" navbar CTA visibility.
 *
 * Regression guard: the navbar is rendered per-page, so it remounts on every
 * navigation. It used to initialise to the non-premium state and refetch the
 * plan on each remount, so the pulsing CTA flashed in for a split second on
 * every section switch — including for paying users. We stub /api/student/plan
 * so the test is deterministic and independent of the demo account's real plan.
 */

function stubPlan(page: Page, premium: boolean, delayMs = 0) {
  return page.route("**/api/student/plan", async (route) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ premium }),
    });
  });
}

async function loginAsStudent(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).pressSequentially("alice@demo.test", { delay: 15 });
  await page.getByLabel(/^password$/i).pressSequentially("demo", { delay: 15 });
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 25_000 });
}

test.describe("Go Premium CTA", () => {
  test("never flashes for a premium student across navigation", async ({ page }) => {
    // 400ms delay widens the window the old bug would have flashed in.
    await stubPlan(page, true, 400);
    await loginAsStudent(page);
    await page.waitForTimeout(700); // let the cache resolve to premium

    const cta = page.getByRole("link", { name: /Go Premium/i });
    for (const section of [/^Jobs$/, /^Applications$/]) {
      await page.getByRole("link", { name: section }).click();
      // Immediate (non-retrying) samples across the async window — the CTA must
      // never be present even for a single frame.
      for (let i = 0; i < 10; i++) {
        expect(await cta.count(), "Go Premium CTA flashed mid-navigation").toBe(0);
        await page.waitForTimeout(50);
      }
    }
  });

  test("shows and persists for a free student", async ({ page }) => {
    await stubPlan(page, false);
    await loginAsStudent(page);
    const cta = page.getByRole("link", { name: /Go Premium/i });
    await expect(cta).toBeVisible();
    await page.getByRole("link", { name: /^Jobs$/ }).click();
    await expect(cta).toBeVisible();
  });
});

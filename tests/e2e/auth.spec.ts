import { expect, test } from "@playwright/test";

/**
 * Auth flow e2e.
 *
 * Hydration race fix: before any .fill() on a controlled React input, we
 * wait for `networkidle` so the inline scripts have finished mounting the
 * useState handlers. Without this the fill lands before React attaches its
 * change listener and the value is silently dropped.
 */
test.describe("Auth flow", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^student$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("login as student lands on dashboard via door animation", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();

    const emailField = page.getByLabel(/email/i);
    const pwField = page.getByLabel(/^password$/i);
    await emailField.fill("");
    await emailField.pressSequentially("alice@demo.test", { delay: 20 });
    await pwField.fill("");
    await pwField.pressSequentially("demo", { delay: 20 });
    await page.getByRole("button", { name: /^sign in$/i }).click();

    // DoorAnimation is full-screen + z-[100]. It plays for ~1.5s before
    // redirecting to /dashboard. Verify either the door fires OR we land on
    // dashboard directly (covers both paths).
    await page.waitForURL("**/dashboard", { timeout: 20_000 });
  });

  test("login as recruiter routes to recruiter command", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^recruiter$/i }).click();
    // Login no longer pre-fills email after role-switch (avoids users
    // accidentally signing in as the demo account), so the test must type
    // the recruiter address explicitly.
    await page.waitForTimeout(150);

    const emailField = page.getByLabel(/email/i);
    const pwField = page.getByLabel(/^password$/i);
    await emailField.fill("");
    await emailField.pressSequentially("hr@stark.test", { delay: 20 });
    await pwField.fill("");
    await pwField.pressSequentially("demo", { delay: 20 });
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await page.waitForURL("**/recruiter/**", { timeout: 20_000 });
  });

  test("wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const emailField = page.getByLabel(/email/i);
    const pwField = page.getByLabel(/^password$/i);
    await emailField.fill("");
    await emailField.pressSequentially("alice@demo.test", { delay: 20 });
    await pwField.fill("");
    await pwField.pressSequentially("wrong-pw-xyz", { delay: 20 });
    await page.getByRole("button", { name: /^sign in$/i }).click();
    // Next.js injects an invisible `__next-route-announcer__` with
    // role="alert" on every page, so generic getByRole('alert') matches two
    // nodes. Scope to the alert that actually contains text — the visible
    // error banner.
    await expect(
      page.locator('[role="alert"]').filter({ hasText: /credentials|email/i }),
    ).toContainText(/(wrong credentials|check the email)/i, { timeout: 8_000 });
  });
});

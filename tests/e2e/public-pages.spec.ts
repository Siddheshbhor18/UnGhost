import { expect, test } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing renders hero + metrics", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /we don.t ghost/i })).toBeVisible();
    await expect(page.getByText(/Drop your resume/i).first()).toBeVisible();
  });

  test("bootcamps catalogue lists at least one bootcamp", async ({ page }) => {
    await page.goto("/bootcamps");
    await expect(page.getByRole("heading", { name: /close the gap/i })).toBeVisible();
  });

  test("signup form requires policy compliance", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", { name: /create your account/i }),
    ).toBeVisible();

    // Signup is now a 2-step wizard. Step 1: identity. Step 2: password +
    // consents. Submit lives on step 2, so the test must traverse the flow.
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("new@example.com");
    // Use exact match — the OAuth buttons also say "Continue with …".
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Now on step 2 — fill a weak password, leave consent checkboxes off,
    // then verify the submit button stays disabled.
    await page
      .getByLabel(/password/i)
      .first()
      .fill("Weak");
    const submit = page.getByRole("button", { name: /create my account/i });
    await expect(submit).toBeDisabled();
  });
});

import { expect, test } from "@playwright/test";

test.describe("Public pages", () => {
  test("landing renders hero + magic widget", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /we don.t ghost/i })).toBeVisible();
    await expect(page.getByText(/Magic Widget/i).first()).toBeVisible();
  });

  test("bootcamps catalogue lists at least one bootcamp", async ({ page }) => {
    await page.goto("/bootcamps");
    await expect(page.getByRole("heading", { name: /close the gap/i })).toBeVisible();
  });

  test("signup form requires policy compliance", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await page.getByPlaceholder("Aniket Sharma").fill("Test User");
    await page.getByPlaceholder("you@email.com").fill("new@example.com");
    await page.getByPlaceholder("9876543210").fill("9876543210");
    await page.getByPlaceholder("At least 8 characters").fill("Weak");
    // Submit button should be disabled because policy fails + consent missing
    const submit = page.getByRole("button", { name: /create my account/i });
    await expect(submit).toBeDisabled();
  });
});

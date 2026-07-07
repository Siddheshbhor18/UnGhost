import { expect, test } from "@playwright/test";

/**
 * /jobs — the public, read-only board preview (the landing's conversion P0:
 * "Browse jobs" CTAs must land on visible roles, not a signup form).
 * Guards: the page is reachable anonymously, roles carry their committed
 * reply windows, only the Apply action is signup-gated, and the landing
 * funnel actually routes here.
 */
test.describe("Public jobs preview", () => {
  test("renders anonymously with reply windows or an honest empty state", async ({
    page,
  }) => {
    await page.goto("/jobs");
    // No auth wall: we stay on /jobs instead of bouncing to /login or /signup.
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(
      page.getByRole("heading", { name: /every role here answers/i }),
    ).toBeVisible();

    const applyLinks = page.getByRole("link", { name: /apply free/i });
    const emptyState = page.getByText(/next batch of roles is being posted/i);
    // Seeded environments show the board; a bare DB shows the honest empty
    // state — either is correct, a blank page is not.
    await expect(applyLinks.first().or(emptyState)).toBeVisible();

    if ((await applyLinks.count()) > 0) {
      // The differentiator is visible pre-signup: committed reply windows.
      await expect(
        page.getByText(/replies in (24|48|72)h/i).first(),
      ).toBeVisible();
      // Apply is the only gated action and deep-links back to the board.
      await expect(applyLinks.first()).toHaveAttribute(
        "href",
        "/signup?next=/student/jobs",
      );
    }
  });

  test("landing jobs CTAs route to the public board, not signup", async ({
    page,
  }) => {
    await page.goto("/");
    const heroCta = page.getByRole("link", { name: /browse live jobs/i });
    expect(await heroCta.count()).toBeGreaterThan(0);
    for (let i = 0; i < (await heroCta.count()); i++) {
      await expect(heroCta.nth(i)).toHaveAttribute("href", "/jobs");
    }
  });

  test("anonymous nav surfaces the jobs board", async ({ page }) => {
    await page.goto("/");
    const navJobs = page
      .locator("header")
      .getByRole("link", { name: "Jobs", exact: true });
    await expect(navJobs).toHaveAttribute("href", "/jobs");
  });
});

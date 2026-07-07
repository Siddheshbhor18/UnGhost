import { expect, test } from "@playwright/test";

/**
 * /instructors — the scroll-storyline instructor page reachable from the
 * "Our instructors" CTA in the landing "Learn the skill. Then land the role."
 * section. Guards: the page renders its roster, the landing CTA points here,
 * and every "Enroll now" CTA deep-links to signup with `next=/bootcamps` so a
 * new user lands on the bootcamp catalog after creating an account.
 */
test.describe("Instructors page", () => {
  test("renders the hero and the instructor roster", async ({ page }) => {
    await page.goto("/instructors");
    await expect(
      page.getByRole("heading", { name: /done the work/i }),
    ).toBeVisible();
    // Three main instructors, each a section heading.
    await expect(
      page.getByRole("heading", { name: "Atharva Pache" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Anshika Reja" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ritu Maurya" }),
    ).toBeVisible();
    // Featured-speaker spotlight is present.
    await expect(
      page.getByRole("heading", { name: /industry looks up to/i }),
    ).toBeVisible();
  });

  test("every Enroll now CTA lands the user on the bootcamp catalog", async ({
    page,
  }) => {
    await page.goto("/instructors");
    const enrollLinks = page.getByRole("link", { name: /enroll now/i });
    const count = await enrollLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(enrollLinks.nth(i)).toHaveAttribute(
        "href",
        "/signup?next=/bootcamps",
      );
    }
  });

  test("landing 'Our instructors' CTA links to /instructors", async ({
    page,
  }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /our instructors/i });
    await expect(cta).toHaveAttribute("href", "/instructors");
  });
});

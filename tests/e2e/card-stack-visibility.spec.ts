import { expect, test, type Page } from "@playwright/test";

/**
 * BootcampCardStack (CardSwap) tab-visibility regression.
 *
 * The GSAP deck cycled on a `setInterval` that keeps firing while the tab is
 * backgrounded, but GSAP's requestAnimationFrame ticker is frozen there — so
 * the per-cycle timelines piled up and all fired at once on return, making the
 * cards jump off then snap back ("Learn the skill. Then land the role." deck).
 *
 * The fix: swap() bails while `document.hidden`, and a `visibilitychange`
 * handler snaps the deck back to its canonical slots on return. This test
 * backgrounds the page with a second tab (a genuine visibility change that
 * pauses rAF), then asserts the deck never surfaces a dropped/scrambled card
 * and settles into a clean 6-slot layout.
 *
 * Slot geometry (BootcampCardStack: cardDistance 24, verticalDistance 36,
 * width 400, height 320, 6 cards, xPercent/yPercent -50): the six canonical
 * translateY values are -160, -196, -232, -268, -304, -340. A card left
 * mid-"drop" carries a +500 offset, so any y above ~60 is the glitch.
 */

type Slot = { x: number; y: number };

async function readDeck(page: Page): Promise<Slot[]> {
  return page.$$eval(".card-swap-container > *", (els) =>
    els.map((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return { x: Math.round(m.m41), y: Math.round(m.m42) };
    }),
  );
}

const Y_MAX = 60; // a stuck "drop" sits ~+340..+500; anything above this is a glitch
const Y_MIN = -420; // deepest canonical slot is -340

test.describe("BootcampCardStack visibility", () => {
  test("deck stays clean across a tab switch", async ({ page, context }) => {
    await page.goto("/");
    await page
      .getByRole("heading", { name: /learn the skill/i })
      .scrollIntoViewIfNeeded();

    const container = page.locator(".card-swap-container");
    await expect(container).toBeVisible();
    await expect(container.locator("> *")).toHaveCount(6);

    // Let a couple of swap cycles run so the deck is genuinely mid-animation.
    await page.waitForTimeout(3000);

    // Background this page by focusing another tab in the same context. This is
    // a real visibility change: the first page's rAF ticker pauses. The buggy
    // build would accumulate ~2 swaps' worth of timelines during this window.
    const other = await context.newPage();
    await other.goto("about:blank");
    await other.bringToFront();
    await page.waitForTimeout(5000);

    // Return to the deck and watch the settle window closely. On the fixed
    // build, place() snaps to canonical slots synchronously, so no sample ever
    // shows a dropped card. On the buggy build, the accumulated timelines fire
    // here and at least one sample catches a card mid-air.
    await page.bringToFront();
    await other.close();

    let sawGlitch = false;
    for (let i = 0; i < 12; i++) {
      const deck = await readDeck(page);
      if (deck.some((c) => c.y > Y_MAX || c.y < Y_MIN)) sawGlitch = true;
      await page.waitForTimeout(80);
    }
    expect(sawGlitch, "a card was left dropped/scrambled after tab return").toBe(
      false,
    );

    // Final invariant: exactly six cards, each at a distinct in-band slot.
    const deck = await readDeck(page);
    expect(deck).toHaveLength(6);
    for (const c of deck) {
      expect(c.y).toBeGreaterThanOrEqual(Y_MIN);
      expect(c.y).toBeLessThanOrEqual(Y_MAX);
    }
    const distinct = new Set(deck.map((c) => `${c.x},${c.y}`));
    expect(distinct.size, "cards collapsed onto the same slot").toBe(6);
  });
});

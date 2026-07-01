import { expect, test, type Page } from "@playwright/test";

/**
 * BootcampCardStack (CardSwap) tab-visibility regression.
 *
 * The GSAP deck cycled on a `setInterval` that keeps firing while the tab is
 * backgrounded, but GSAP's requestAnimationFrame ticker is frozen there — so
 * the per-cycle timelines piled up and all fired at once on return, making the
 * cards jump off then snap back ("Learn the skill. Then land the role." deck).
 *
 * The fix adds a `visibilitychange` handler: on return it kills any in-flight
 * tween and calls place(), which snaps every card to its canonical slot with an
 * instant gsap.set. That handler is the production mechanism a real browser
 * fires on every tab switch.
 *
 * This test exercises that handler deterministically: it waits until a card is
 * genuinely mid-drop, fires visibilitychange, and asserts the deck is snapped
 * back to a clean canonical layout with no card left mid-air. (We drive the
 * event directly rather than via a real second tab — headless bringToFront does
 * not reliably deliver visibilitychange, which made the round-trip approach
 * flaky and non-discriminating.)
 *
 * Slot geometry (BootcampCardStack: cardDistance 24, verticalDistance 36,
 * width 400, height 320, 6 cards, xPercent/yPercent -50): the six canonical
 * translateY values are -160, -196, -232, -268, -304, -340. A card mid-"drop"
 * carries a +500 offset, so any y above ~60 is a card in motion, not at rest.
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

const Y_MAX = 60; // resting slots are <= -160; a dropping card climbs toward +340
const Y_MIN = -420; // deepest canonical slot is -340

test.describe("BootcampCardStack visibility", () => {
  test("visibilitychange snaps a mid-drop deck back to canonical", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("heading", { name: /learn the skill/i })
      .scrollIntoViewIfNeeded();

    const container = page.locator(".card-swap-container");
    await expect(container).toBeVisible();
    await expect(container.locator("> *")).toHaveCount(6);

    // Wait until a card is genuinely mid-drop (out of the resting band) — the
    // exact state the old bug scrambled on tab return. Poll densely at a fixed
    // interval: the drop lasts only ~0.7s, so expect.poll's backing-off
    // intervals would miss it. Dispatch the event the instant we catch a drop.
    let caughtDrop = false;
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline) {
      if ((await readDeck(page)).some((c) => c.y > Y_MAX)) {
        caughtDrop = true;
        break;
      }
      await page.waitForTimeout(40);
    }
    expect(caughtDrop, "deck never entered a drop animation").toBe(true);
    // Fire the visibility event the CardSwap handler listens for. On the fixed
    // build this runs place() synchronously (gsap.set is instant), snapping the
    // whole deck to its canonical slots. On the buggy build nothing intervenes
    // and the card keeps dropping.
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );

    // Read once the snap has applied. The interval is restarted by the handler,
    // so the next real swap is ~2600ms out — this read lands in a rest window.
    await page.waitForTimeout(150);
    const deck = await readDeck(page);

    // Every card back at a distinct, in-band canonical slot: no mid-air card,
    // no collapse onto the same slot.
    expect(deck).toHaveLength(6);
    for (const c of deck) {
      expect(c.y, `card left mid-drop at y=${c.y}`).toBeGreaterThanOrEqual(Y_MIN);
      expect(c.y, `card left mid-drop at y=${c.y}`).toBeLessThanOrEqual(Y_MAX);
    }
    const distinct = new Set(deck.map((c) => `${c.x},${c.y}`));
    expect(distinct.size, "cards collapsed onto the same slot").toBe(6);
  });
});

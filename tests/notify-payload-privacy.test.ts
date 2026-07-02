/**
 * Regression test — closes the round-6 HIGH:
 *   `notify()` used to publish the notification's `title`, `body`,
 *   `priority`, and `kind` on the Pusher `user:<id>` channel. That channel
 *   is PUBLIC (no `private-` prefix), so any browser with the shipped
 *   NEXT_PUBLIC_PUSHER_KEY could subscribe to another user's channel by
 *   guessing their id and read every notification in real time — InMail
 *   subjects, message previews, ban/suspend reasons.
 *
 * The fix strips the payload to just `{ ts }`. The bell only needs a
 * "something arrived" trigger and re-reads via `/api/notifications`,
 * which is session-scoped server-side.
 *
 * This test asserts the invariant: notify(...) MUST NOT put `title`,
 * `body`, `kind`, or `priority` on the realtime wire.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { notify } from "@/server/store";
import { pollMockEvents } from "@/server/integrations/realtime";

interface RealtimePayloadShape {
  ts?: unknown;
  title?: unknown;
  body?: unknown;
  kind?: unknown;
  priority?: unknown;
}

function drainAll(channel: string): unknown[] {
  return pollMockEvents(channel, 0).map((e) => e.data);
}

describe("notify() — Pusher payload privacy regression", () => {
  beforeEach(async () => {
    // The mock ring buffer persists across tests; skip the check by using a
    // unique user id per test so we never see stale events.
  });

  it("does NOT publish notification title / body / kind / priority on the wire", async () => {
    const target = "usr_privacy_a";
    await notify({
      userId: target,
      kind: "inmail_received",
      priority: "high",
      title: "SECRET_TITLE_STARK_HR",
      body: "SECRET_BODY_want_to_hire_you",
    });

    const payloads = drainAll(`user:${target}`);
    expect(payloads.length).toBeGreaterThan(0);

    for (const raw of payloads) {
      // Guard the shape rather than casting so a schema drift trips the test.
      expect(raw && typeof raw === "object").toBe(true);
      const p = raw as RealtimePayloadShape;
      expect(p.title).toBeUndefined();
      expect(p.body).toBeUndefined();
      expect(p.kind).toBeUndefined();
      expect(p.priority).toBeUndefined();
      // A ts is fine (safe metadata for animation).
    }
  });

  it("does not leak the notification content by string search either", async () => {
    // Belt-and-suspenders: even if a future refactor renames the fields, a
    // stringify-and-search catches the raw string leak.
    const target = "usr_privacy_b";
    const secret = "MARKER_9d3f2c1e_LEAK_CANARY";
    await notify({
      userId: target,
      kind: "message_received",
      title: `New msg with ${secret}`,
      body: `Preview containing ${secret}`,
    });

    const payloads = drainAll(`user:${target}`);
    for (const raw of payloads) {
      expect(JSON.stringify(raw)).not.toContain(secret);
    }
  });

  it("publishes on the per-user channel, NEVER a global one", async () => {
    const target = "usr_privacy_c";
    await notify({
      userId: target,
      kind: "system",
      title: "hi",
      body: "hi",
    });
    // If a future refactor accidentally broadcasts to `notifications`,
    // `all`, or an empty channel string, this catches it.
    expect(pollMockEvents("notifications", 0)).toHaveLength(0);
    expect(pollMockEvents("all", 0)).toHaveLength(0);
    expect(pollMockEvents("", 0)).toHaveLength(0);
    expect(pollMockEvents(`user:${target}`, 0).length).toBeGreaterThan(0);
  });
});

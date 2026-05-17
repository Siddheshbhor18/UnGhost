// Realtime adapter — Pusher Channels in prod, no-op mock in dev.
// Phase 1 mock writes events to an in-memory ring buffer so the dev UI can
// poll /api/realtime?channel=foo when keys are absent. Phase 6 swaps to Pusher.
//
// Required env for live mode:
//   PUSHER_APP_ID
//   PUSHER_KEY
//   PUSHER_SECRET
//   PUSHER_CLUSTER  e.g. "ap2"

import { createHmac } from "node:crypto";

export interface RealtimeEvent<T = unknown> {
  channel: string;
  event: string;
  data: T;
  ts: number;
}

export function realtimeMode(): "live" | "mock" {
  return process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET
    ? "live"
    : "mock";
}

const ringBuffer: RealtimeEvent[] = [];
const RING_MAX = 200;

export function pollMockEvents(channel: string, sinceTs = 0): RealtimeEvent[] {
  return ringBuffer.filter(
    (e) => e.channel === channel && e.ts > sinceTs,
  );
}

/** Publish an event. Server-side only. */
export async function publish<T>(
  channel: string,
  event: string,
  data: T,
): Promise<{ ok: boolean; channel: "pusher" | "mock"; error?: string }> {
  if (realtimeMode() === "mock") {
    ringBuffer.push({ channel, event, data, ts: Date.now() });
    if (ringBuffer.length > RING_MAX) ringBuffer.splice(0, ringBuffer.length - RING_MAX);
    return { ok: true, channel: "mock" };
  }
  try {
    const appId = process.env.PUSHER_APP_ID!;
    const key = process.env.PUSHER_KEY!;
    const secret = process.env.PUSHER_SECRET!;
    const cluster = process.env.PUSHER_CLUSTER ?? "mt1";
    const body = JSON.stringify({ name: event, channel, data: JSON.stringify(data) });
    const ts = Math.floor(Date.now() / 1000);
    const md5 = createHmac("md5", "").update(body).digest("hex");
    const path = `/apps/${appId}/events`;
    const params = `auth_key=${key}&auth_timestamp=${ts}&auth_version=1.0&body_md5=${md5}`;
    const stringToSign = `POST\n${path}\n${params}`;
    const sig = createHmac("sha256", secret)
      .update(stringToSign)
      .digest("hex");
    const url = `https://api-${cluster}.pusher.com${path}?${params}&auth_signature=${sig}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) {
      return { ok: false, channel: "pusher", error: `Pusher ${res.status}` };
    }
    return { ok: true, channel: "pusher" };
  } catch (e) {
    return {
      ok: false,
      channel: "pusher",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

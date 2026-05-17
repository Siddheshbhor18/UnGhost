// Background-jobs adapter — Inngest in prod, fire-and-forget mock in dev.
// Required env for live mode:
//   INNGEST_EVENT_KEY
//   INNGEST_SIGNING_KEY (only for receivers; not needed to send)

export interface SendEventInput<T = unknown> {
  /** Event name, e.g. "sla.sweep" or "application.advance". */
  name: string;
  data: T;
  /** Optional unique key for idempotency. */
  id?: string;
}

export function jobsMode(): "live" | "mock" {
  return process.env.INNGEST_EVENT_KEY ? "live" : "mock";
}

interface MockEvent {
  name: string;
  data: unknown;
  ts: number;
}
const recentMockEvents: MockEvent[] = [];

export function recentJobEvents(): MockEvent[] {
  return [...recentMockEvents].reverse().slice(0, 50);
}

/** Send an event. In mock mode this is a no-op (caller still has to do the work). */
export async function sendEvent<T>(
  input: SendEventInput<T>,
): Promise<{ ok: boolean; channel: "inngest" | "mock"; error?: string }> {
  if (jobsMode() === "mock") {
    recentMockEvents.push({
      name: input.name,
      data: input.data,
      ts: Date.now(),
    });
    if (recentMockEvents.length > 200) recentMockEvents.shift();
    // eslint-disable-next-line no-console
    console.log(`[jobs:mock] ${input.name}`, input.data);
    return { ok: true, channel: "mock" };
  }
  try {
    const key = process.env.INNGEST_EVENT_KEY!;
    const res = await fetch(`https://inn.gs/e/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        data: input.data,
        id: input.id,
        ts: Date.now(),
      }),
    });
    if (!res.ok) {
      return { ok: false, channel: "inngest", error: `Inngest ${res.status}` };
    }
    return { ok: true, channel: "inngest" };
  } catch (e) {
    return {
      ok: false,
      channel: "inngest",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

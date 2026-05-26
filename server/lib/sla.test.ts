import { describe, expect, it } from "vitest";
import { slaCountdown } from "./sla";

describe("slaCountdown", () => {
  it("calculates active countdown correctly", () => {
    const now = new Date("2026-05-26T12:00:00.000Z");
    const deadline = new Date("2026-05-26T14:30:00.000Z").toISOString(); // 2h 30m away
    const out = slaCountdown(deadline, now);
    expect(out.expired).toBe(false);
    expect(out.hours).toBe(2);
    expect(out.minutes).toBe(30);
    expect(out.pulse).toBe(true); // <4h
    expect(out.label).toBe("02h : 30m");
  });

  it("calculates expired countdown correctly", () => {
    const now = new Date("2026-05-26T12:00:00.000Z");
    const deadline = new Date("2026-05-26T08:45:00.000Z").toISOString(); // 3h 15m ago
    const out = slaCountdown(deadline, now);
    expect(out.expired).toBe(true);
    expect(out.hours).toBe(3);
    expect(out.minutes).toBe(15);
    expect(out.pulse).toBe(false);
    expect(out.label).toBe("BREACHED · 3h15m ago");
  });
});

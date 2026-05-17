import { describe, expect, it } from "vitest";
import { sendOtp, verifyOtp, getLastMockOtp } from "./index";

describe("sms.sendOtp (mock channel)", () => {
  it("issues a 6-digit code and stores it for retrieval", async () => {
    const res = await sendOtp("+919999999999");
    expect(res.ok).toBe(true);
    expect(res.channel).toBe("mock");
    expect(res.demoOtp).toMatch(/^\d{6}$/);
    expect(await getLastMockOtp("+919999999999")).toBe(res.demoOtp);
  });

  it("rejects too-short phone numbers", async () => {
    const res = await sendOtp("12345");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("bad_phone");
  });
});

describe("sms.verifyOtp", () => {
  it("matches the stored code and clears it after success", async () => {
    const issued = await sendOtp("+919998881111");
    const res = await verifyOtp("+919998881111", issued.demoOtp!);
    expect(res.ok).toBe(true);
    // Replay must fail — code consumed.
    const replay = await verifyOtp("+919998881111", issued.demoOtp!);
    expect(replay.ok).toBe(false);
    expect(replay.error).toBe("otp_expired");
  });

  it("rejects a wrong code and counts toward lockout", async () => {
    await sendOtp("+919777775555");
    const r = await verifyOtp("+919777775555", "000000");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("otp_mismatch");
  });

  it("locks the phone after 3 wrong attempts", async () => {
    await sendOtp("+919555556666");
    await verifyOtp("+919555556666", "000000");
    await verifyOtp("+919555556666", "000000");
    const third = await verifyOtp("+919555556666", "000000");
    expect(third.error).toBe("otp_locked");
    const fourth = await verifyOtp("+919555556666", "000000");
    expect(fourth.error).toBe("otp_locked");
  });
});

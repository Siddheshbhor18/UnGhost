import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "./razorpay";

const KEY_SECRET = "test_key_secret_abc";
const WEBHOOK_SECRET = "test_webhook_secret_xyz";

let savedKey: string | undefined;
let savedWebhook: string | undefined;

beforeAll(() => {
  savedKey = process.env.RAZORPAY_KEY_SECRET;
  savedWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterAll(() => {
  process.env.RAZORPAY_KEY_SECRET = savedKey;
  process.env.RAZORPAY_WEBHOOK_SECRET = savedWebhook;
});

describe("verifyPaymentSignature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";
  const validSig = createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  it("accepts a correct signature", () => {
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: validSig }),
    ).toBe(true);
  });

  it("rejects a tampered signature of equal length", () => {
    const flipped =
      validSig.slice(0, -1) + (validSig.endsWith("a") ? "b" : "a");
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: flipped }),
    ).toBe(false);
  });

  it("rejects a signature for a different order/payment pair", () => {
    expect(
      verifyPaymentSignature({
        orderId: "order_DIFFERENT",
        paymentId,
        signature: validSig,
      }),
    ).toBe(false);
  });

  it("rejects a wrong-length signature without throwing", () => {
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: "short" }),
    ).toBe(false);
  });

  it("rejects when the key secret is missing", () => {
    const prev = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(
      verifyPaymentSignature({ orderId, paymentId, signature: validSig }),
    ).toBe(false);
    process.env.RAZORPAY_KEY_SECRET = prev;
  });
});

describe("verifyWebhookSignature", () => {
  const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });
  const validSig = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  it("accepts a correct raw-body signature", () => {
    expect(verifyWebhookSignature(rawBody, validSig)).toBe(true);
  });

  it("rejects a forged signature", () => {
    expect(verifyWebhookSignature(rawBody, "deadbeef")).toBe(false);
  });

  it("rejects when the body differs by a single byte", () => {
    expect(verifyWebhookSignature(rawBody + " ", validSig)).toBe(false);
  });

  it("rejects a null signature header", () => {
    expect(verifyWebhookSignature(rawBody, null)).toBe(false);
  });

  it("rejects when the webhook secret is unset", () => {
    const prev = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    expect(verifyWebhookSignature(rawBody, validSig)).toBe(false);
    process.env.RAZORPAY_WEBHOOK_SECRET = prev;
  });
});

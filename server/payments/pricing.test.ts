import { describe, expect, it } from "vitest";
import { computeTotalPaise, formatPaiseAsINR, paiseToRupees } from "./pricing";

describe("computeTotalPaise", () => {
  it("computes ₹5,000 base + 18% GST = ₹5,900 total", () => {
    const out = computeTotalPaise({ priceInPaise: 500000, gstPercent: 18 });
    expect(out.baseInPaise).toBe(500000);
    expect(out.gstInPaise).toBe(90000);
    expect(out.totalInPaise).toBe(590000);
  });

  it("handles ₹4,999 base + 18% GST with rounding (899.82 paise → 900 paise)", () => {
    // 499900 * 18 / 100 = 89982 paise exactly. No rounding needed but proves
    // the integer-math path holds for non-round prices.
    const out = computeTotalPaise({ priceInPaise: 499900, gstPercent: 18 });
    expect(out.gstInPaise).toBe(89982);
    expect(out.totalInPaise).toBe(589882);
  });

  it("rounds GST half-up to nearest paise", () => {
    // 333 * 18 / 100 = 59.94 → rounds to 60. Catches off-by-one on
    // odd-priced micro-bootcamps.
    const out = computeTotalPaise({ priceInPaise: 333, gstPercent: 18 });
    expect(out.gstInPaise).toBe(60);
    expect(out.totalInPaise).toBe(393);
  });

  it("handles zero GST (legacy course, no tax)", () => {
    const out = computeTotalPaise({ priceInPaise: 100000, gstPercent: 0 });
    expect(out.gstInPaise).toBe(0);
    expect(out.totalInPaise).toBe(100000);
  });

  it("handles zero price (free bootcamp)", () => {
    const out = computeTotalPaise({ priceInPaise: 0, gstPercent: 18 });
    expect(out.baseInPaise).toBe(0);
    expect(out.gstInPaise).toBe(0);
    expect(out.totalInPaise).toBe(0);
  });

  it("rejects negative price", () => {
    expect(() =>
      computeTotalPaise({ priceInPaise: -1, gstPercent: 18 }),
    ).toThrow(/negative/i);
  });

  it("rejects negative GST", () => {
    expect(() =>
      computeTotalPaise({ priceInPaise: 100000, gstPercent: -5 }),
    ).toThrow(/negative/i);
  });

  it("returns integers — never floats", () => {
    // Floating-point arithmetic risk: 0.1 + 0.2 = 0.30000000000000004.
    // Verify our outputs are always exact integers.
    const out = computeTotalPaise({ priceInPaise: 599900, gstPercent: 18 });
    expect(Number.isInteger(out.baseInPaise)).toBe(true);
    expect(Number.isInteger(out.gstInPaise)).toBe(true);
    expect(Number.isInteger(out.totalInPaise)).toBe(true);
  });
});

describe("paiseToRupees", () => {
  it("converts 500000 paise → 5000", () => {
    expect(paiseToRupees(500000)).toBe(5000);
  });
  it("converts 1 paise → 0.01", () => {
    expect(paiseToRupees(1)).toBe(0.01);
  });
});

describe("formatPaiseAsINR", () => {
  it("formats ₹5,000 without decimals when whole rupees", () => {
    // Normalise NBSPs so the assertion isn't locale-fragile.
    expect(formatPaiseAsINR(500000).replace(/ /g, " ")).toBe("₹5,000");
  });

  it("formats ₹5,900 with Indian grouping", () => {
    expect(formatPaiseAsINR(590000).replace(/ /g, " ")).toBe("₹5,900");
  });

  it("includes paise when amount has a fractional part", () => {
    expect(formatPaiseAsINR(50050).replace(/ /g, " ")).toBe("₹500.50");
  });

  it("forces .00 suffix when withPaise: true", () => {
    expect(
      formatPaiseAsINR(500000, { withPaise: true }).replace(/ /g, " "),
    ).toBe("₹5,000.00");
  });

  it("formats lakh-range amounts with Indian grouping", () => {
    // ₹1,00,000 (one lakh) — Indian grouping has the first comma after 3
    // digits then every 2 thereafter.
    expect(formatPaiseAsINR(10000000).replace(/ /g, " ")).toBe("₹1,00,000");
  });
});

describe("billing orderId regex parsing", () => {
  const regex = /^bill_(pro|premium)_(.+)_(\d+)$/;

  it("successfully parses standard user IDs with underscores", () => {
    const orderId = "bill_pro_usr_koy3x8c1abc_1779718262456";
    const match = regex.exec(orderId);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("pro");
    expect(match![2]).toBe("usr_koy3x8c1abc");
    expect(match![3]).toBe("1779718262456");
  });

  it("successfully parses premium plan with underscores", () => {
    const orderId = "bill_premium_usr_abcdefg_1234567890";
    const match = regex.exec(orderId);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("premium");
    expect(match![2]).toBe("usr_abcdefg");
    expect(match![3]).toBe("1234567890");
  });

  it("handles complex user IDs with multiple underscores", () => {
    const orderId = "bill_pro_usr_some_complex_id_here_1779718262456";
    const match = regex.exec(orderId);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("pro");
    expect(match![2]).toBe("usr_some_complex_id_here");
    expect(match![3]).toBe("1779718262456");
  });

  it("rejects invalid formats", () => {
    expect(regex.exec("spons_pro_usr_koy3x8c1abc_1779718262456")).toBeNull();
    expect(regex.exec("bill_invalid_usr_koy3x8c1abc_1779718262456")).toBeNull();
    expect(regex.exec("bill_pro_usr_koy3x8c1abc_notanumber")).toBeNull();
  });
});

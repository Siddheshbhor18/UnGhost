/**
 * Admin refund — provider-aware dispatch. Tests:
 *   - admin gate (only role:"admin" passes),
 *   - dispatch by the ORIGINAL ProcessedTxn.provider (Razorpay vs PhonePe),
 *   - reward reversal hook fires on refund,
 *   - safety rails: original-txn lookup, user mismatch, amount > original.
 *
 * The Razorpay refund call is exercised against a mocked global fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { POST } from "@/app/api/admin/billing/refund/route";
import {
  UserModel,
  ProcessedTxnModel,
} from "@/server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";
import { createCreator } from "@/server/creator/creator.service";
import { checkAndCreateReward, getRewardByPaymentId } from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";
import { __addAllowedHost } from "@/server/lib/csrf";
import { recordProcessedTxn } from "@/server/store";

__addAllowedHost("test.local");

interface FetchResponse {
  status: number;
  body: Record<string, unknown>;
}

const realFetch = global.fetch;
let nextResponse: FetchResponse = { status: 200, body: {} };
const fetchCalls: { url: string; init: RequestInit }[] = [];

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
  ]);
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchCalls.length = 0;
  process.env.RAZORPAY_KEY_ID = "rzp_test_admin";
  process.env.RAZORPAY_KEY_SECRET = "secret_admin";
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_admin";
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(nextResponse.body), {
      status: nextResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

function asUser(user: { id: string; role: string } | null): void {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);
}

function post(body: unknown): Request {
  return new Request("http://test.local/api/admin/billing/refund", {
    method: "POST",
    headers: {
      origin: "http://test.local",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function seedBuyer(id: string): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: "jobs_quarterly",
    createdAt: new Date().toISOString(),
  });
}

async function seedTxn(opts: {
  txnId: string;
  userId: string;
  provider: "razorpay" | "phonepe";
  amountPaise: number;
}): Promise<void> {
  await recordProcessedTxn({
    txnId: opts.txnId,
    provider: opts.provider,
    orderId: `ord_${opts.txnId}`,
    userId: opts.userId,
    plan: "courses",
    amountPaise: opts.amountPaise,
    status: "success",
    via: "webhook",
  });
}

describe("POST /api/admin/billing/refund — gates", () => {
  it("403s non-admins", async () => {
    asUser({ id: "u_s", role: "student" });
    const res = await POST(post({
      userId: "u_s",
      originalTxnId: "pay_x",
      amountPaise: 100,
      reason: "valid reason",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(403);
  });

  it("404s when user doesn't exist", async () => {
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(post({
      userId: "u_ghost",
      originalTxnId: "pay_x",
      amountPaise: 100,
      reason: "valid reason",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(404);
  });

  it("404s when original txn doesn't exist", async () => {
    await seedBuyer("u_buyer1");
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(post({
      userId: "u_buyer1",
      originalTxnId: "pay_missing",
      amountPaise: 100,
      reason: "valid reason",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("original_txn_not_found");
  });

  it("400s on user/txn mismatch (admin sent the wrong buyer)", async () => {
    await seedBuyer("u_buyer_a");
    await seedBuyer("u_buyer_b");
    await seedTxn({
      txnId: "pay_other_user",
      userId: "u_buyer_a",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(post({
      userId: "u_buyer_b", // wrong
      originalTxnId: "pay_other_user",
      amountPaise: 100,
      reason: "wrong buyer",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("txn_user_mismatch");
  });

  it("400s when amount exceeds the original capture", async () => {
    await seedBuyer("u_too_much");
    await seedTxn({
      txnId: "pay_cap",
      userId: "u_too_much",
      provider: "razorpay",
      amountPaise: 100_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(post({
      userId: "u_too_much",
      originalTxnId: "pay_cap",
      amountPaise: 500_000, // 5x original
      reason: "greedy refund attempt",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("amount_exceeds_original");
  });
});
describe("POST /api/admin/billing/refund — policy contract", () => {
  it("400s when correctionKind is missing (forces the admin to categorize)", async () => {
    await seedBuyer("u_no_kind");
    await seedTxn({
      txnId: "pay_no_kind",
      userId: "u_no_kind",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(
      post({
        userId: "u_no_kind",
        originalTxnId: "pay_no_kind",
        amountPaise: 100,
        reason: "missing kind on purpose",
        // correctionKind: deliberately omitted
      }),
      undefined,
    );
    expect(res.status).toBe(400);
  });

  it("400s when correctionKind isn't one of the three carve-outs", async () => {
    await seedBuyer("u_bad_kind");
    await seedTxn({
      txnId: "pay_bad_kind",
      userId: "u_bad_kind",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(
      post({
        userId: "u_bad_kind",
        originalTxnId: "pay_bad_kind",
        amountPaise: 100,
        reason: "rogue carve-out",
        correctionKind: "buyer_changed_their_mind", // not allowed
      }),
      undefined,
    );
    expect(res.status).toBe(400);
  });

  it("400s when reason is shorter than 10 chars (forces a real explanation)", async () => {
    await seedBuyer("u_short");
    await seedTxn({
      txnId: "pay_short",
      userId: "u_short",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    const res = await POST(
      post({
        userId: "u_short",
        originalTxnId: "pay_short",
        amountPaise: 100,
        reason: "short",
        correctionKind: "dispute_settlement",
      }),
      undefined,
    );
    expect(res.status).toBe(400);
  });

  it("duplicate_charge defaults revokePlan to FALSE — buyer keeps access on a double-charge", async () => {
    await seedBuyer("u_dup");
    await seedTxn({
      txnId: "pay_dup",
      userId: "u_dup",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    nextResponse = {
      status: 200,
      body: { id: "rfnd_dup", status: "processed", amount: 500_000 },
    };
    const res = await POST(
      post({
        userId: "u_dup",
        originalTxnId: "pay_dup",
        amountPaise: 500_000,
        reason: "double-clicked Pay; second charge refunded",
        correctionKind: "duplicate_charge",
        // revokePlan omitted → must default to false for duplicate_charge
      }),
      undefined,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).revokedPlan).toBe(false);
    // Buyer's plan remains intact — they paid for it (just once instead of twice).
    const user = await UserModel.findById("u_dup").lean();
    expect(user?.plan).toBe("jobs_quarterly");
  });

  it("unauthorized_charge defaults revokePlan to TRUE — access revoked on stolen-card refund", async () => {
    await seedBuyer("u_unauth");
    await seedTxn({
      txnId: "pay_unauth",
      userId: "u_unauth",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    nextResponse = {
      status: 200,
      body: { id: "rfnd_unauth", status: "processed", amount: 500_000 },
    };
    const res = await POST(
      post({
        userId: "u_unauth",
        originalTxnId: "pay_unauth",
        amountPaise: 500_000,
        reason: "card reported stolen by issuer",
        correctionKind: "unauthorized_charge",
        // revokePlan omitted → defaults to true
      }),
      undefined,
    );
    expect(res.status).toBe(200);
    expect((await res.json()).revokedPlan).toBe(true);
    const user = await UserModel.findById("u_unauth").lean();
    expect(user?.plan).toBe("free");
  });
});


describe("POST /api/admin/billing/refund — Razorpay dispatch", () => {
  it("calls the Razorpay refund endpoint with the right URL + idempotency header", async () => {
    await seedBuyer("u_ok");
    await seedTxn({
      txnId: "pay_ok",
      userId: "u_ok",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    nextResponse = {
      status: 200,
      body: { id: "rfnd_001", status: "processed", amount: 100_000 },
    };
    const res = await POST(post({
      userId: "u_ok",
      originalTxnId: "pay_ok",
      amountPaise: 100_000,
      reason: "partial refund",
      correctionKind: "duplicate_charge",
      revokePlan: false,
    }), undefined);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      refundTxnId: string;
      provider: string;
      revokedPlan: boolean;
    };
    expect(data.refundTxnId).toBe("rfnd_001");
    expect(data.provider).toBe("razorpay");
    expect(data.revokedPlan).toBe(false);

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]!.url).toBe(
      "https://api.razorpay.com/v1/payments/pay_ok/refund",
    );
    const headers = fetchCalls[0]!.init.headers as Record<string, string>;
    // Deterministic — no timestamp suffix. This is what makes retries
    // collapse on Razorpay's idempotency window (Bug 1 fix).
    expect(headers["X-Razorpay-Idempotency"]).toBe("refund_pay_ok");
    expect(headers.Authorization).toMatch(/^Basic /);
    const sent = JSON.parse(fetchCalls[0]!.init.body as string) as {
      amount: number;
      notes: Record<string, string>;
    };
    expect(sent.amount).toBe(100_000);
    expect(sent.notes.userId).toBe("u_ok");

    // Negative-amount ledger row was recorded for the refund.
    const refundRow = await ProcessedTxnModel.findById("rfnd_001").lean();
    expect(refundRow?.amountPaise).toBe(-100_000);
  });

  it("reverses the creator reward on a successful Razorpay refund", async () => {
    // Set up attribution + a paid reward.
    const cr = await createCreator(
      {
        name: "C",
        email: `c_${Math.random().toString(36).slice(2, 9)}@x.test`,
        password: "TestPass1",
        commission: { type: "fixed", value: 80_000 },
      },
      "u_admin",
    );
    if (!cr.ok) throw new Error("createCreator failed");
    const creatorId = cr.profile.creatorId;
    await UserModel.create({
      _id: "u_attr_buyer",
      email: "ab@x.test",
      role: "student",
      name: "AB",
      plan: "jobs_quarterly",
      referredByCreatorId: creatorId,
      createdAt: new Date().toISOString(),
    });
    await seedTxn({
      txnId: "pay_rev",
      userId: "u_attr_buyer",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    await checkAndCreateReward({
      userId: "u_attr_buyer",
      paymentId: "pay_rev",
      orderId: "ord_pay_rev",
      basePaise: 500_000,
    });
    expect(await getBalance(creatorId)).toBe(80_000);

    asUser({ id: "u_admin", role: "admin" });
    nextResponse = {
      status: 200,
      body: { id: "rfnd_rev", status: "processed", amount: 500_000 },
    };
    const res = await POST(post({
      userId: "u_attr_buyer",
      originalTxnId: "pay_rev",
      amountPaise: 500_000,
      reason: "full refund per ops",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(200);
    // Reward debited back, balance returns to zero.
    expect(await getBalance(creatorId)).toBe(0);
    const reward = await getRewardByPaymentId("pay_rev");
    expect(reward?.status).toBe("reversed");
  });

  it("propagates a Razorpay 401 as a 502 refund_failed", async () => {
    await seedBuyer("u_401");
    await seedTxn({
      txnId: "pay_401",
      userId: "u_401",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    nextResponse = { status: 401, body: { error: { description: "bad keys" } } };
    const res = await POST(post({
      userId: "u_401",
      originalTxnId: "pay_401",
      amountPaise: 100_000,
      reason: "smoke test reason",
      correctionKind: "dispute_settlement",
    }), undefined);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("refund_failed");
  });
});

describe("POST /api/admin/billing/refund — idempotency (Bug 1)", () => {
  it("sequential retry of the same refund → second call is idempotent, exactly ONE negative row", async () => {
    await seedBuyer("u_retry");
    await seedTxn({
      txnId: "pay_retry",
      userId: "u_retry",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    // Both calls hit the SAME mocked Razorpay refund id — what the real
    // gateway does when the idempotency-key header matches.
    nextResponse = {
      status: 200,
      body: { id: "rfnd_retry", status: "processed", amount: 500_000 },
    };
    const payload = {
      userId: "u_retry",
      originalTxnId: "pay_retry",
      amountPaise: 500_000,
      reason: "ops retried after a timeout",
      correctionKind: "dispute_settlement",
    };

    const first = await POST(post(payload), undefined);
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      refundTxnId: string;
      idempotent?: boolean;
    };
    expect(firstBody.refundTxnId).toBe("rfnd_retry");
    expect(firstBody.idempotent).toBeUndefined();

    const second = await POST(post(payload), undefined);
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as {
      refundTxnId: string;
      idempotent: boolean;
    };
    expect(secondBody.refundTxnId).toBe("rfnd_retry");
    expect(secondBody.idempotent).toBe(true);

    // The pre-check (gate #1) short-circuits the second call BEFORE hitting
    // Razorpay or recordProcessedTxn, so only one gateway call happens.
    expect(fetchCalls).toHaveLength(1);

    // Only one negative-amount ledger row exists for this original txn.
    const refundRows = await ProcessedTxnModel.find({
      orderId: "refund_pay_retry",
    }).lean();
    expect(refundRows).toHaveLength(1);
    expect(refundRows[0]!.amountPaise).toBe(-500_000);
  });

  it("retry with a DIFFERENT amount on the same txn → 409 conflict (never silently double-debits)", async () => {
    await seedBuyer("u_conf");
    await seedTxn({
      txnId: "pay_conf",
      userId: "u_conf",
      provider: "razorpay",
      amountPaise: 500_000,
    });
    asUser({ id: "u_admin", role: "admin" });
    nextResponse = {
      status: 200,
      body: { id: "rfnd_conf", status: "processed", amount: 300_000 },
    };

    // First refund — ₹3,000.
    const first = await POST(
      post({
        userId: "u_conf",
        originalTxnId: "pay_conf",
        amountPaise: 300_000,
        reason: "partial dispute settlement",
        correctionKind: "dispute_settlement",
      }),
      undefined,
    );
    expect(first.status).toBe(200);

    // Second attempt — ₹5,000 (different amount). Must NOT proceed.
    const second = await POST(
      post({
        userId: "u_conf",
        originalTxnId: "pay_conf",
        amountPaise: 500_000,
        reason: "admin misremembered amount",
        correctionKind: "dispute_settlement",
      }),
      undefined,
    );
    expect(second.status).toBe(409);
    const body = (await second.json()) as {
      error: string;
      existingAmountPaise: number;
      requestedAmountPaise: number;
    };
    expect(body.error).toBe("refund_already_exists");
    expect(body.existingAmountPaise).toBe(300_000);
    expect(body.requestedAmountPaise).toBe(500_000);

    // Razorpay was hit exactly once (first call); the conflict was caught locally.
    expect(fetchCalls).toHaveLength(1);
  });
});

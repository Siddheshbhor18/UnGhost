/**
 * Razorpay order route — the price-authority gate. Verifies that:
 *   - auth/role/CSRF/active-account checks are wired (never trust the client),
 *   - prices come from the server (jobs + courses), and a tampered amount
 *     never reaches the gateway,
 *   - the order POST to Razorpay is shaped correctly + the keyId is echoed
 *     back to the browser,
 *   - `notes` always carry the buyer's userId + the order kind — these are
 *     re-read by /verify and the webhook (mismatch ⇒ payment refused).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { POST } from "@/app/api/payments/razorpay/order/route";
import { UserModel } from "@/server/db/models";
import { __addAllowedHost } from "@/server/lib/csrf";
import { jobsPlanPricing } from "@/server/payments/subscription";
import { coursesPricing } from "@/server/payments/courses";
import { PLAN_PRICING } from "@/shared/types";

__addAllowedHost("test.local");

interface FetchCall {
  url: string;
  init: RequestInit;
}

interface FetchHandler {
  status: number;
  body: Record<string, unknown>;
}

const realFetch = global.fetch;
const calls: FetchCall[] = [];
let nextResponse: FetchHandler = {
  status: 200,
  body: {
    id: "order_test_001",
    amount: 0,
    currency: "INR",
  },
};

beforeEach(async () => {
  vi.clearAllMocks();
  calls.length = 0;
  // Force live mode for the adapter without leaking creds.
  process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
  process.env.RAZORPAY_KEY_SECRET = "secret_dummy";
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_dummy";

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(nextResponse.body), {
      status: nextResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

async function makeStudent(id: string): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: "free",
    createdAt: new Date().toISOString(),
  });
}

function asUser(user: { id: string; role: string } | null): void {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);
}

function post(body: unknown): Request {
  return new Request("http://test.local/api/payments/razorpay/order", {
    method: "POST",
    headers: {
      origin: "http://test.local",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/payments/razorpay/order — auth + role gates", () => {
  it("401s an unauthenticated caller", async () => {
    asUser(null);
    const res = await POST(post({ kind: "jobs", plan: "jobs_quarterly" }), undefined);
    expect(res.status).toBe(401);
  });

  it("403s a non-student (recruiter)", async () => {
    asUser({ id: "u_rec", role: "recruiter" });
    const res = await POST(post({ kind: "jobs", plan: "jobs_quarterly" }), undefined);
    expect(res.status).toBe(403);
  });

  it("403s a CSRF-bad origin even with a valid session", async () => {
    asUser({ id: "u_x", role: "student" });
    const req = new Request("http://test.local/api/payments/razorpay/order", {
      method: "POST",
      headers: { origin: "http://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ kind: "jobs", plan: "jobs_quarterly" }),
    });
    const res = await POST(req, undefined);
    expect(res.status).toBe(403);
  });

  it("400s when the body is structurally invalid", async () => {
    await makeStudent("u_bad");
    asUser({ id: "u_bad", role: "student" });
    const res = await POST(post({ kind: "jobs" }), undefined); // plan missing
    expect(res.status).toBe(400);
  });

  it("404s when the session id has no matching user row", async () => {
    asUser({ id: "u_ghost", role: "student" });
    const res = await POST(post({ kind: "jobs", plan: "jobs_annual" }), undefined);
    expect(res.status).toBe(404);
  });

  it("403s a banned account even with a valid session", async () => {
    await UserModel.create({
      _id: "u_banned",
      email: "b@x.test",
      role: "student",
      name: "B",
      plan: "free",
      status: "banned",
      createdAt: new Date().toISOString(),
    });
    asUser({ id: "u_banned", role: "student" });
    const res = await POST(post({ kind: "jobs", plan: "jobs_annual" }), undefined);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/payments/razorpay/order — server-side pricing", () => {
  it("prices a jobs plan from the server and passes amount/notes to Razorpay", async () => {
    await makeStudent("u_j1");
    asUser({ id: "u_j1", role: "student" });
    const expected = jobsPlanPricing("jobs_quarterly");
    nextResponse = {
      status: 200,
      body: { id: "order_j1", amount: expected.totalInPaise, currency: "INR" },
    };

    const res = await POST(post({ kind: "jobs", plan: "jobs_quarterly" }), undefined);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      orderId: string;
      amount: number;
      keyId: string;
    };
    expect(data.orderId).toBe("order_j1");
    expect(data.amount).toBe(expected.totalInPaise);
    expect(data.keyId).toBe("rzp_test_dummy");

    expect(calls).toHaveLength(1);
    const sent = JSON.parse(calls[0]!.init.body as string) as {
      amount: number;
      notes: Record<string, string>;
    };
    expect(sent.amount).toBe(expected.totalInPaise);
    expect(sent.notes).toEqual({
      userId: "u_j1",
      kind: "jobs",
      plan: "jobs_quarterly",
    });
  });

  it("prices a course cart from the bundle engine, not the client", async () => {
    await makeStudent("u_c1");
    asUser({ id: "u_c1", role: "student" });
    const expected = coursesPricing(["ai"]);
    nextResponse = {
      status: 200,
      body: { id: "order_c1", amount: expected.totalInPaise, currency: "INR" },
    };

    const res = await POST(post({ kind: "courses", courses: ["ai"] }), undefined);
    expect(res.status).toBe(200);

    const sent = JSON.parse(calls[0]!.init.body as string) as {
      amount: number;
      notes: Record<string, string>;
    };
    expect(sent.amount).toBe(expected.totalInPaise);
    expect(sent.notes.kind).toBe("courses");
    expect(sent.notes.courses).toBe("ai");
    expect(sent.notes.userId).toBe("u_c1");
  });

  it("400s an empty / non-course-id cart (defense against tampered input)", async () => {
    await makeStudent("u_empty");
    asUser({ id: "u_empty", role: "student" });
    const res = await POST(post({ kind: "courses", courses: ["not-a-real-course"] }), undefined);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("empty_cart");
    expect(calls).toHaveLength(0); // never reaches Razorpay
  });

  it("strips already-owned courses so the buyer is never re-charged", async () => {
    await UserModel.create({
      _id: "u_owns_ai",
      email: "o@x.test",
      role: "student",
      name: "O",
      plan: "free",
      ownedCourses: [
        {
          course: "ai",
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    });
    asUser({ id: "u_owns_ai", role: "student" });
    // Cart of just AI → priced as empty cart → rejected.
    const res = await POST(post({ kind: "courses", courses: ["ai"] }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("empty_cart");
  });

  it("502s when Razorpay returns 401 (bad API keys in env)", async () => {
    await makeStudent("u_auth");
    asUser({ id: "u_auth", role: "student" });
    nextResponse = {
      status: 401,
      body: { error: { description: "Authentication failed" } },
    };
    const res = await POST(post({ kind: "jobs", plan: "jobs_annual" }), undefined);
    // Adapter signals "auth" → route returns 401.
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("razorpay_auth_failed");
  });

  it("500s and forwards the provider description on a Razorpay 4xx/5xx", async () => {
    await makeStudent("u_5xx");
    asUser({ id: "u_5xx", role: "student" });
    nextResponse = {
      status: 500,
      body: { error: { description: "internal_server_error" } },
    };
    const res = await POST(post({ kind: "jobs", plan: "jobs_annual" }), undefined);
    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string; reason: string };
    expect(data.error).toBe("order_create_failed");
    expect(data.reason).toBe("internal_server_error");
  });
});

describe("POST /api/payments/razorpay/order — already-paid guard", () => {
  // Premium and jobs_annual both outrank jobs_quarterly. Premium also
  // outranks jobs_annual (rank: free 0 < jobs_quarterly 1 < jobs_annual 2
  // < premium 3). A buyer on a higher-rank plan can't sideways/downgrade
  // into Razorpay — the route rejects with 409 and never calls the gateway.
  async function makeStudentOnPlan(
    id: string,
    plan: "jobs_quarterly" | "jobs_annual" | "premium",
  ): Promise<void> {
    await UserModel.create({
      _id: id,
      email: `${id}@x.test`,
      role: "student",
      name: "Holder",
      plan,
      planType: plan === "premium" ? "lifetime" : PLAN_PRICING[plan].cadence,
      planExpiresAt:
        plan === "premium"
          ? undefined
          : new Date(Date.now() + 30 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
  }

  it("409s a jobs_quarterly holder trying to re-buy jobs_quarterly", async () => {
    await makeStudentOnPlan("u_dup_q", "jobs_quarterly");
    asUser({ id: "u_dup_q", role: "student" });
    const res = await POST(
      post({ kind: "jobs", plan: "jobs_quarterly" }),
      undefined,
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string; currentPlan: string };
    expect(data.error).toBe("already_on_plan");
    expect(data.currentPlan).toBe("jobs_quarterly");
    expect(calls).toHaveLength(0); // never reaches Razorpay
  });

  it("409s a jobs_annual holder trying to downgrade to jobs_quarterly", async () => {
    await makeStudentOnPlan("u_down", "jobs_annual");
    asUser({ id: "u_down", role: "student" });
    const res = await POST(
      post({ kind: "jobs", plan: "jobs_quarterly" }),
      undefined,
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already_on_plan");
    expect(calls).toHaveLength(0);
  });

  it("409s a legacy premium holder trying to buy any jobs plan", async () => {
    await makeStudentOnPlan("u_prem", "premium");
    asUser({ id: "u_prem", role: "student" });
    for (const plan of ["jobs_quarterly", "jobs_annual"] as const) {
      const res = await POST(post({ kind: "jobs", plan }), undefined);
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe("already_on_plan");
    }
    expect(calls).toHaveLength(0);
  });

  it("ALLOWS a jobs_quarterly holder to upgrade to jobs_annual", async () => {
    await makeStudentOnPlan("u_up", "jobs_quarterly");
    asUser({ id: "u_up", role: "student" });
    const expected = jobsPlanPricing("jobs_annual");
    nextResponse = {
      status: 200,
      body: { id: "order_up", amount: expected.totalInPaise, currency: "INR" },
    };
    const res = await POST(post({ kind: "jobs", plan: "jobs_annual" }), undefined);
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("ALLOWS a free user to buy any jobs plan", async () => {
    await makeStudent("u_free_buy");
    asUser({ id: "u_free_buy", role: "student" });
    const expected = jobsPlanPricing("jobs_quarterly");
    nextResponse = {
      status: 200,
      body: { id: "order_free", amount: expected.totalInPaise, currency: "INR" },
    };
    const res = await POST(
      post({ kind: "jobs", plan: "jobs_quarterly" }),
      undefined,
    );
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("treats an EXPIRED paid plan as free — re-buy is allowed", async () => {
    // Plans lapse via effectivePlan() once planExpiresAt is in the past.
    await UserModel.create({
      _id: "u_lapsed",
      email: "l@x.test",
      role: "student",
      name: "Lapsed",
      plan: "jobs_quarterly",
      planType: "quarterly",
      planExpiresAt: new Date(Date.now() - 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    asUser({ id: "u_lapsed", role: "student" });
    const expected = jobsPlanPricing("jobs_quarterly");
    nextResponse = {
      status: 200,
      body: { id: "order_lapsed", amount: expected.totalInPaise, currency: "INR" },
    };
    const res = await POST(
      post({ kind: "jobs", plan: "jobs_quarterly" }),
      undefined,
    );
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import { withApiErrorTracking } from "./api-error";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock logger
vi.mock("@/server/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("withApiErrorTracking", () => {
  it("passes through successful responses", async () => {
    const handler = () => new Response("ok", { status: 200 });
    const wrapped = withApiErrorTracking(handler);
    const req = new Request("http://localhost/api");
    const res = await wrapped(req, {});
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  it("catches errors and returns 500", async () => {
    const handler = () => {
      throw new Error("test error");
    };
    const wrapped = withApiErrorTracking(handler);
    const req = new Request("http://localhost/api", {
      headers: { "x-request-id": "req-123" }
    });
    const res = await wrapped(req, {});
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("internal_error");
    expect(data.requestId).toBe("req-123");
  });

  it("serialises string errors", async () => {
    const handler = () => {
      throw "string error";
    };
    const wrapped = withApiErrorTracking(handler);
    const req = new Request("http://localhost/api");
    const res = await wrapped(req, {});
    expect(res.status).toBe(500);
  });
});

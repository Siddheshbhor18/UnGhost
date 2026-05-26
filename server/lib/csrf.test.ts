import { describe, expect, it } from "vitest";
import { requireSameOrigin, __addAllowedHost } from "./csrf";

describe("csrf.requireSameOrigin", () => {
  it("allows requests from exact matching allowed hosts", () => {
    const req = new Request("http://localhost:3000/api/endpoint", {
      headers: {
        origin: "http://localhost:3000",
        referer: "http://localhost:3000/dashboard"
      }
    });
    expect(requireSameOrigin(req)).toBeNull();
  });

  it("blocks unrecognized or cross-site origins", () => {
    const req = new Request("http://localhost:3000/api/endpoint", {
      headers: {
        origin: "http://malicious.attacker.com"
      }
    });
    const res = requireSameOrigin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("allows custom added hosts dynamically", () => {
    __addAllowedHost("custom.trusted.com");
    const req = new Request("http://localhost:3000/api/endpoint", {
      headers: {
        origin: "http://custom.trusted.com"
      }
    });
    expect(requireSameOrigin(req)).toBeNull();
  });

  it("allows Cloudflare preview wildcards", () => {
    const req = new Request("http://localhost:3000/api/endpoint", {
      headers: {
        origin: "https://preview-1234.unghost.com"
      }
    });
    expect(requireSameOrigin(req)).toBeNull();
  });
});

/**
 * `safeNext` + `resolveSignupRole` — the two URL gates that protect the auth
 * surfaces. `safeNext` is the open-redirect filter shared by `/login` and
 * `/signup`; `resolveSignupRole` keeps `?role=` from seeding instructor or
 * admin into the signup wizard's state.
 *
 * Pins every rejection vector we've seen exploited (or that obvious mutation
 * testing would expose) so the next refactor of either helper can't quietly
 * loosen the contract.
 */
import { describe, expect, it } from "vitest";
import { safeNext, resolveSignupRole } from "@/shared/lib/safe-redirect";

describe("safeNext — open-redirect filter", () => {
  it("returns null for empty / nullish / non-string input", () => {
    expect(safeNext(null)).toBeNull();
    expect(safeNext(undefined)).toBeNull();
    expect(safeNext("")).toBeNull();
    expect(safeNext(123 as unknown as string)).toBeNull();
  });

  it("accepts a single-leading-slash same-origin path", () => {
    expect(safeNext("/student/jobs")).toBe("/student/jobs");
    expect(safeNext("/bootcamps")).toBe("/bootcamps");
    expect(safeNext("/")).toBe("/");
  });

  it("preserves the query string + fragment on a same-origin path", () => {
    expect(safeNext("/student/jobs?q=foo")).toBe("/student/jobs?q=foo");
    expect(safeNext("/bootcamps#pricing")).toBe("/bootcamps#pricing");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("//evil.com/page")).toBeNull();
  });

  it("rejects backslash-smuggled origin (/\\evil.com)", () => {
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext("/\\evil.com/page")).toBeNull();
  });

  it("rejects full URLs of every common scheme", () => {
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("http://evil.com")).toBeNull();
    expect(safeNext("javascript:alert(1)")).toBeNull();
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeNext("vbscript:msgbox(1)")).toBeNull();
    expect(safeNext("file:///etc/passwd")).toBeNull();
  });

  it("rejects relative paths (no leading slash)", () => {
    expect(safeNext("evil.com")).toBeNull();
    expect(safeNext("./student/jobs")).toBeNull();
    expect(safeNext("../admin")).toBeNull();
  });

  it("rejects whitespace and ASCII control characters", () => {
    expect(safeNext("/foo bar")).toBeNull();
    expect(safeNext("/foo\tbar")).toBeNull();
    expect(safeNext("/foo\nbar")).toBeNull();
    expect(safeNext("/foo\rbar")).toBeNull();
    expect(safeNext("/foo\x00bar")).toBeNull();
    expect(safeNext("/foo\x1fbar")).toBeNull();
    expect(safeNext(" /student/jobs")).toBeNull();
  });
});

describe("resolveSignupRole — URL allowlist for ?role=", () => {
  it("returns student when nothing usable is supplied", () => {
    expect(resolveSignupRole(null)).toBe("student");
    expect(resolveSignupRole(undefined)).toBe("student");
    expect(resolveSignupRole("")).toBe("student");
    expect(resolveSignupRole(42 as unknown as string)).toBe("student");
  });

  it("accepts the two self-serve roles unchanged", () => {
    expect(resolveSignupRole("student")).toBe("student");
    expect(resolveSignupRole("recruiter")).toBe("recruiter");
  });

  it("rejects ops-provisioned roles and falls back to student", () => {
    expect(resolveSignupRole("admin")).toBe("student");
    expect(resolveSignupRole("instructor")).toBe("student");
  });

  it("rejects arbitrary / hostile role values", () => {
    expect(resolveSignupRole("Student")).toBe("student"); // case-sensitive
    expect(resolveSignupRole("recruiter; DROP TABLE users;")).toBe("student");
    expect(resolveSignupRole("../admin")).toBe("student");
    expect(resolveSignupRole("<script>")).toBe("student");
  });
});

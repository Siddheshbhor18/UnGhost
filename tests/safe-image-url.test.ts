/**
 * `safeImageUrl` — host-allowlist gate for any user-supplied image src.
 *
 * Pins every rejection branch so a future "loosen the allowlist" change has
 * to update tests too, and no hostile URL form sneaks past silently.
 */
import { describe, expect, it } from "vitest";
import { safeImageUrl } from "@/shared/lib/safe-image-url";

describe("safeImageUrl — image src guard", () => {
  describe("empty / non-string input", () => {
    it("returns null for nullish / empty / non-string", () => {
      expect(safeImageUrl(null)).toBeNull();
      expect(safeImageUrl(undefined)).toBeNull();
      expect(safeImageUrl("")).toBeNull();
      expect(safeImageUrl("   ")).toBeNull();
      expect(safeImageUrl(42 as unknown as string)).toBeNull();
    });
  });

  describe("same-origin absolute paths", () => {
    it("accepts a single-leading-slash path", () => {
      expect(safeImageUrl("/uploads/foo.png")).toBe("/uploads/foo.png");
      expect(safeImageUrl("/thumbs/ai-cover.webp")).toBe("/thumbs/ai-cover.webp");
    });

    it("rejects protocol-relative paths (//evil.com/x.png)", () => {
      expect(safeImageUrl("//evil.com/x.png")).toBeNull();
    });

    it("rejects backslash-smuggled paths (/\\evil.com)", () => {
      expect(safeImageUrl("/\\evil.com/x.png")).toBeNull();
    });

    it("rejects paths with embedded control characters", () => {
      expect(safeImageUrl("/foo\nbar.png")).toBeNull();
      expect(safeImageUrl("/foo\x00bar.png")).toBeNull();
    });
  });

  describe("absolute URLs", () => {
    it("accepts an HTTPS URL on the default allowlist", () => {
      expect(safeImageUrl("https://cdn.unghost.in/thumbs/ai.png")).toBe(
        "https://cdn.unghost.in/thumbs/ai.png",
      );
      expect(safeImageUrl("https://uploads.unghost.in/foo.webp")).toBe(
        "https://uploads.unghost.in/foo.webp",
      );
      expect(
        safeImageUrl("https://res.cloudinary.com/unghost/image/upload/v1/foo.png"),
      ).toBe("https://res.cloudinary.com/unghost/image/upload/v1/foo.png");
    });

    it("rejects HTTP (mixed-content downgrade)", () => {
      expect(safeImageUrl("http://cdn.unghost.in/foo.png")).toBeNull();
    });

    it("rejects javascript:, data:, file:, vbscript:", () => {
      expect(safeImageUrl("javascript:alert(1)")).toBeNull();
      expect(safeImageUrl("data:image/svg+xml,<svg/onload=alert(1)>")).toBeNull();
      expect(safeImageUrl("file:///etc/passwd")).toBeNull();
      expect(safeImageUrl("vbscript:msgbox(1)")).toBeNull();
    });

    it("rejects an HTTPS URL whose host is not on the allowlist", () => {
      expect(safeImageUrl("https://evil.com/x.png")).toBeNull();
      expect(safeImageUrl("https://attacker.cdn.com/x.png")).toBeNull();
    });

    it("rejects malformed URLs", () => {
      expect(safeImageUrl("https://")).toBeNull();
      expect(safeImageUrl("https://[bad")).toBeNull();
    });

    it("normalises the host comparison to lower-case", () => {
      expect(safeImageUrl("https://CDN.UnGhost.IN/foo.png")).toBe(
        "https://cdn.unghost.in/foo.png",
      );
    });
  });

  describe("extraHosts option", () => {
    it("accepts a host added via extraHosts", () => {
      const url = "https://partner-cdn.example/foo.png";
      expect(safeImageUrl(url)).toBeNull();
      expect(safeImageUrl(url, { extraHosts: ["partner-cdn.example"] })).toBe(url);
    });

    it("extraHosts does not loosen the HTTPS requirement", () => {
      expect(
        safeImageUrl("http://partner-cdn.example/foo.png", {
          extraHosts: ["partner-cdn.example"],
        }),
      ).toBeNull();
    });
  });

  describe("allowAnyHost escape hatch", () => {
    it("accepts any HTTPS host when explicitly set", () => {
      expect(
        safeImageUrl("https://anywhere.example/x.png", { allowAnyHost: true }),
      ).toBe("https://anywhere.example/x.png");
    });

    it("allowAnyHost still rejects HTTP and bad schemes", () => {
      expect(
        safeImageUrl("http://anywhere.example/x.png", { allowAnyHost: true }),
      ).toBeNull();
      expect(
        safeImageUrl("javascript:alert(1)", { allowAnyHost: true }),
      ).toBeNull();
    });
  });
});

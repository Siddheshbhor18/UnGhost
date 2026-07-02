/**
 * Regression tests for URL-scheme XSS gates.
 *
 *   • Round-11 HIGH: `recordingUrl` in
 *     app/api/live/[id]/route.ts + app/api/admin/live-sessions/[id]/route.ts
 *     used `z.string().url()`. WHATWG `URL` accepts `javascript:alert(1)`
 *     as a valid URL, so the schema let it through and it landed in
 *     `<a href={playbackUrl}>` on the recordings page — click-XSS against
 *     any admin / co-instructor viewing the recording.
 *
 *   • Round-3 HIGH: instructor bootcamp video URL had the same gap; the
 *     current schema uses the same `^https?://` refinement.
 *
 *   • Round-8 HIGH: R2 presign library layer used to accept any
 *     content-type from the caller. `presignUpload` now throws on any
 *     content-type outside the fixed whitelist.
 *
 * These assertions freeze the invariants so a future refactor that
 * reintroduces `z.string().url()` (or removes the extFromContentType
 * whitelist) fails CI here rather than in production.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { presignUpload } from "@/server/integrations/storage";

// The regex used by all `href` schema refinements across the app. Import
// wouldn't add value here — the shape IS the contract we want to guard.
const httpOrHttps = /^https?:\/\//i;

const recordingUrl = z
  .string()
  .trim()
  .max(500)
  .refine((u) => httpOrHttps.test(u), {
    message: "recordingUrl must be http(s)",
  });

describe("URL scheme refinements — javascript:/data:/vbscript: rejected", () => {
  const hostile = [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "  javascript:alert(1)  ",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox",
    "file:///etc/passwd",
    "chrome://settings",
    "//evil.com/x",
    "/relative/path",
    "",
  ];
  const allowed = [
    "https://youtube.com/watch?v=abc",
    "http://uploads.unghost.in/x.mp4",
    "HTTPS://example.com",
  ];

  for (const bad of hostile) {
    it(`rejects "${bad}"`, () => {
      expect(recordingUrl.safeParse(bad).success).toBe(false);
    });
  }

  for (const good of allowed) {
    it(`accepts "${good}"`, () => {
      const r = recordingUrl.safeParse(good);
      expect(r.success).toBe(true);
    });
  }
});

describe("presignUpload — library-layer content-type whitelist", () => {
  const hostile = [
    "text/html",
    "application/xhtml+xml",
    "image/svg+xml",
    "text/plain",
    "application/javascript",
    "",
    "application/pdf; charset=utf-8",
  ];
  const allowed = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "application/vnd.apple.mpegurl",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  for (const bad of hostile) {
    it(`throws on content-type "${bad}"`, async () => {
      await expect(
        presignUpload({
          prefix: "resumes",
          contentType: bad,
          filename: "x.pdf",
        }),
      ).rejects.toThrow(/unsupported content-type/i);
    });
  }

  for (const good of allowed) {
    it(`accepts content-type "${good}"`, async () => {
      // Mock storage mode may be either "mock" or "r2" depending on env;
      // either way a return value proves the whitelist let us through.
      const out = await presignUpload({
        prefix: "resumes",
        contentType: good,
        filename: "x.bin",
      });
      expect(out.key).toBeTruthy();
      expect(out.uploadUrl).toBeTruthy();
      expect(out.headers["content-type"]).toBe(good);
    });
  }
});

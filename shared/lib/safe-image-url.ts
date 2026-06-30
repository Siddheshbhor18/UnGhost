/**
 * URL guard for user-supplied image `src` attributes (recruiter-uploaded
 * bootcamp thumbnails, partner logos, etc.).
 *
 * `<img src=>` won't execute `javascript:` in modern browsers, but a hostile
 * URL can still:
 *   - Beacon back to a third-party origin (tracking pixel exfiltration)
 *   - Force a mixed-content downgrade on an HTTPS page
 *   - Smuggle a `data:` payload past Content-Security-Policy
 *   - Crash the renderer with a malformed scheme
 *
 * This validator returns the URL only when it is one of:
 *   - A same-origin absolute path (`/uploads/foo.png`)
 *   - An `https://` URL whose host is on the allowlist (or any host when
 *     `allowAnyHost` is set explicitly — used for first-party admin tools)
 *
 * Anything else → `null`. Callers should fall through to the placeholder.
 *
 * Keep the allowlist tight: every host added here is a vector if compromised.
 */

/** Hosts the platform actively serves images from. Extend deliberately. */
const DEFAULT_IMAGE_HOSTS: Record<string, true> = {
  // First-party uploads / CDN
  "unghost.in": true,
  "cdn.unghost.in": true,
  "uploads.unghost.in": true,
  // Trusted OAuth avatar providers (already used by next-auth in this repo).
  "lh3.googleusercontent.com": true,
  // Cloudinary — used for transformed thumbnails in some workflows.
  "res.cloudinary.com": true,
};

export interface SafeImageUrlOptions {
  /** Extra hosts to allow on top of the default first-party set. */
  extraHosts?: readonly string[];
  /** Bypass the host allowlist entirely. Only use behind admin auth. */
  allowAnyHost?: boolean;
}

export function safeImageUrl(
  raw: string | null | undefined,
  options: SafeImageUrlOptions = {},
): string | null {
  if (!raw) return null;
  if (typeof raw !== "string") return null;
  // Strip whitespace and reject any embedded control characters — both can
  // be used to fool downstream URL parsers (e.g. `\n` to split a header).
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (/[\x00-\x1f]/.test(trimmed)) return null;

  // Same-origin absolute paths are always safe — but block protocol-relative
  // (`//evil.com/x.png`) and backslash-smuggled variants.
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
    return trimmed;
  }

  // Absolute URL — must parse, must be HTTPS, must be on the allowlist.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  if (options.allowAnyHost) return parsed.toString();

  const host = parsed.hostname.toLowerCase();
  const allowed =
    DEFAULT_IMAGE_HOSTS[host] ||
    (options.extraHosts?.some((h) => h.toLowerCase() === host) ?? false);
  if (!allowed) return null;

  return parsed.toString();
}

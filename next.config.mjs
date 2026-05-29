/** @type {import('next').NextConfig} */

// Production CSP. Aims for "no surprises" without breaking PhonePe redirects,
// Pusher websockets, Sentry transport, 100ms video, OAuth popups, R2 images.
//
// We accept `'unsafe-inline'` on scripts + styles for now because Next.js
// injects inline bootstrap + Tailwind sometimes emits inline style attrs.
// Tightening to nonces is Phase 6 work (requires a request-scoped nonce in
// middleware + Script `nonce` prop on every <Script>).
const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' kept on for Next dev runtime + some Sentry source maps.
  // In prod a stricter set is possible once we switch to nonce-based CSP.
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.sentry-cdn.com https://browser.sentry-cdn.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sentry.io https://*.pusher.com wss://*.pusher.com https://api.phonepe.com https://api-preprod.phonepe.com https://*.100ms.live wss://*.100ms.live https://*.cloudflare.com https://*.r2.cloudflarestorage.com https://www.youtube.com",
  // R2 public CDN + uploaded video playback. Adjust the literal host below
  // to match your R2_PUBLIC_BASE_URL if you serve via a custom domain.
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
  // PhonePe may bounce through a hosted checkout. Allow it as a frame source.
  "frame-src 'self' https://*.phonepe.com https://www.youtube.com",
  // Block our app being embedded anywhere — defeats clickjacking.
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const isProd = process.env.NODE_ENV === "production";

// HSTS is intentionally OMITTED in development. The header tells browsers
// "always use HTTPS for this hostname" — Chrome caches that for `localhost`
// permanently, then refuses subsequent HTTP loads of the dev server with
// `ERR_SSL_PROTOCOL_ERROR`. Only send HSTS in production where TLS is real.
const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          // 2 years, include subdomains, preload-eligible.
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// CSP's `upgrade-insecure-requests` directive also forces HTTPS — yank it in
// dev for the same reason as HSTS. The full prod CSP still ships in prod.
const DEV_CSP = CSP.replace("; upgrade-insecure-requests", "");
const ACTIVE_CSP = isProd ? CSP : DEV_CSP;
securityHeaders[0] = { key: "Content-Security-Policy", value: ACTIVE_CSP };

const nextConfig = {
  reactStrictMode: true,
  // standalone build = optimal Docker image. Next.js copies only the runtime
  // files needed into .next/standalone, ~30% smaller than `next start`.
  output: "standalone",
  // Required by @sentry/nextjs to keep its instrumentation files external.
  experimental: {
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Strip the powered-by header (minor security hygiene).
  poweredByHeader: false,
  // Set a build-time version that the logger + Sentry + health endpoint use.
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION ??
      process.env.GITHUB_SHA ??
      "dev",
  },
  async headers() {
    return [
      {
        // Apply to every route. Static assets pass through unchanged because
        // the headers append, not override, anything Next.js already sets.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

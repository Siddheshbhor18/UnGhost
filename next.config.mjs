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
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.sentry-cdn.com https://browser.sentry-cdn.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sentry.io https://*.pusher.com wss://*.pusher.com https://api.phonepe.com https://api-preprod.phonepe.com https://*.100ms.live wss://*.100ms.live https://*.cloudflare.com",
  "media-src 'self' blob:",
  // PhonePe may bounce through a hosted checkout. Allow it as a frame source.
  "frame-src 'self' https://*.phonepe.com",
  // Block our app being embedded anywhere — defeats clickjacking.
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  {
    key: "Strict-Transport-Security",
    // 2 years, include subdomains, preload-eligible.
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy header, complements `frame-ancestors 'none'` for older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Mic enabled for AI-coach voice + live sessions. Camera off-by-default
    // until live video flow ships fully. Geo + FLoC off entirely.
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

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

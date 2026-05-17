/** @type {import('next').NextConfig} */
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
};

export default nextConfig;

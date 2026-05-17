import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["server/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["server/**/*.ts"],
      exclude: [
        "server/**/*.test.ts",
        "server/db/seeds/**",
        "server/integrations/claude.ts",
      ],
      thresholds: {
        // Sprint B Day 5 starting bar — monotonic climb to 70% by Sprint D.
        // Today: 4 critical domains covered (password, reset-token, OTP/lockout,
        // tickets/templates). Climb plan documented in docs/07-roadmap.md.
        lines: 12,
        functions: 11,
        branches: 12,
        statements: 12,
      },
    },
  },
  resolve: {
    alias: {
      "@/server": path.resolve(__dirname, "server"),
      "@/shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "."),
    },
  },
});

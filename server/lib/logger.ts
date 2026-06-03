/**
 * Structured logger — Pino-backed.
 *
 * Every server-side log goes through this module so prod logs are valid
 * JSON Lines (ingestible by Axiom / Datadog / Better Stack). In dev we
 * pipe through pino-pretty for human-readable output.
 *
 * Usage:
 *
 *   import { logger } from "@/server/lib/logger";
 *   logger.info({ userId, jobId }, "application.apply");
 *   logger.warn({ phone, reason }, "otp.rate-limited");
 *   logger.error({ err }, "payments.gateway-timeout");
 *
 * Each line carries:
 *   - app.version (from NEXT_PUBLIC_APP_VERSION or "dev")
 *   - app.environment (NODE_ENV)
 *   - app.region (DEPLOY_REGION, defaults to "local")
 *   - the message + structured fields
 */
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: {
    "app.version": process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    "app.environment": process.env.NODE_ENV ?? "development",
    "app.region": process.env.DEPLOY_REGION ?? "local",
  },
  // In dev only — switch to pino-pretty for readable output.
  transport: !isProd
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname,app.region",
        },
      }
    : undefined,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "req.headers.authorization",
      "req.headers.cookie",
      "creds.password",
      "body.password",
      "body.token",
      // DPDP: never log raw personal/financial identifiers.
      "phone",
      "*.phone",
      "contactPhone",
      "*.contactPhone",
      "payerMobile",
      "*.payerMobile",
      "otp",
      "*.otp",
      "utr",
      "*.utr",
      "email",
      "*.email",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Create a child logger with a stable correlation id so every log line
 * within one request can be traced. Pass into route handlers.
 */
export function withCorrelationId(corrId: string) {
  return logger.child({ "request.id": corrId });
}

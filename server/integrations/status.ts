// Unified integration-status helper. Used by /admin/integrations and by
// the demo-mode badge.
import { aiMode, aiProvider } from "@/server/integrations/ai";
import { emailMode } from "@/server/integrations/email";
import { paymentsMode } from "@/server/integrations/payments";
import { realtimeMode } from "@/server/integrations/realtime";
import { jobsMode } from "@/server/integrations/queue";
import { redisMode } from "@/server/db/redis";
import { storageMode } from "@/server/integrations/storage";

export type IntegrationMode = "live" | "mock";

export interface IntegrationStatus {
  id:
    | "ai"
    | "email"
    | "payments"
    | "realtime"
    | "jobs"
    | "redis"
    | "storage"
    | "oauth_google"
    | "oauth_linkedin";
  label: string;
  provider: string;
  mode: IntegrationMode;
  /** Env keys this integration looks for. */
  envKeys: string[];
  /** Short hint shown if missing. */
  hint?: string;
}

export function listIntegrations(): IntegrationStatus[] {
  return [
    {
      id: "ai",
      label: "AI (LLM)",
      provider:
        aiProvider() === "groq"
          ? "Groq Llama 3.1 8B Instant (→ Gemini fallback)"
          : aiProvider() === "gemini"
            ? "Google Gemini 2.5 Flash"
            : aiProvider() === "anthropic"
              ? "Anthropic Claude Haiku 4.5"
              : "Mock (deterministic)",
      mode: aiMode(),
      envKeys: ["GROQ_API_KEY", "GOOGLE_AI_API_KEY", "ANTHROPIC_API_KEY"],
      hint: "Priority: GROQ_API_KEY (low-latency primary) > GOOGLE_AI_API_KEY (fallback) > ANTHROPIC_API_KEY. Each provider catches its own failures and chains down.",
    },
    {
      id: "redis",
      label: "Redis / cache",
      provider: "Upstash",
      mode: redisMode() === "upstash" ? "live" : "mock",
      envKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
      hint: "Add Upstash credentials to persist OTPs, reset tokens, and rate-limit counters across restarts and instances.",
    },
    {
      id: "storage",
      label: "Object storage",
      provider: "Cloudflare R2",
      mode: storageMode() === "r2" ? "live" : "mock",
      envKeys: [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET",
        "R2_PUBLIC_BASE_URL",
      ],
      hint: "Add R2 credentials to store resume PDFs, company logos, and bootcamp covers in production.",
    },
    {
      id: "email",
      label: "Email",
      provider: "Resend",
      mode: emailMode(),
      envKeys: ["RESEND_API_KEY", "RESEND_FROM"],
      hint: "Add RESEND_API_KEY to send real verification + reset emails.",
    },
    {
      id: "payments",
      label: "Payments",
      provider: "PhonePe",
      mode: paymentsMode(),
      envKeys: [
        "PHONEPE_MERCHANT_ID",
        "PHONEPE_SALT_KEY",
        "PHONEPE_SALT_INDEX",
        "PHONEPE_BASE_URL",
      ],
      hint: "Add PhonePe credentials to take real bootcamp + sponsorship payments.",
    },
    {
      id: "realtime",
      label: "Realtime",
      provider: "Pusher Channels",
      mode: realtimeMode(),
      envKeys: ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"],
      hint: "Add Pusher keys for true realtime messaging + live-session presence.",
    },
    {
      id: "jobs",
      label: "Background jobs",
      provider: "Inngest",
      mode: jobsMode(),
      envKeys: ["INNGEST_EVENT_KEY"],
      hint: "Add INNGEST_EVENT_KEY to run SLA sweeps + cron-style jobs at scale.",
    },
    {
      id: "oauth_google",
      label: "Google OAuth",
      provider: "Google",
      mode:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? "live"
          : "mock",
      envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
      hint: "Add Google OAuth client to enable 'Continue with Google'.",
    },
    {
      id: "oauth_linkedin",
      label: "LinkedIn OAuth",
      provider: "LinkedIn",
      mode:
        process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET
          ? "live"
          : "mock",
      envKeys: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
      hint: "Add LinkedIn OAuth client to enable 'Continue with LinkedIn'.",
    },
  ];
}

/** True iff every integration is live. Used by the navbar demo badge. */
export function isFullyLive(): boolean {
  return listIntegrations().every((i) => i.mode === "live");
}

/** Count of mock-mode integrations. */
export function mockCount(): number {
  return listIntegrations().filter((i) => i.mode === "mock").length;
}

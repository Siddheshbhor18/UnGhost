/**
 * Slack alert sink. Posts to an incoming-webhook URL if SLACK_WEBHOOK_URL is
 * set, otherwise logs the alert via the structured logger. Three channels:
 *
 *   - "engineering" — daily ops noise (5xx spikes, slow queries, RL hits)
 *   - "prod"        — production-only deploy + incident announcements
 *   - "incidents"   — SEV1/SEV2 paging events
 *
 * Each channel is mapped to its own webhook URL via env vars. If a channel's
 * webhook is missing we fall back to the engineering channel so the alert
 * still surfaces rather than disappearing silently.
 */
import { logger } from "@/server/lib/logger";

export type SlackChannel = "engineering" | "prod" | "incidents";
export type SlackSeverity = "info" | "warning" | "error" | "critical";

const COLOR: Record<SlackSeverity, string> = {
  info: "#0284C7",
  warning: "#D97706",
  error: "#DC2626",
  critical: "#7F1D1D",
};

function webhookUrl(channel: SlackChannel): string | undefined {
  if (channel === "incidents")
    return (
      process.env.SLACK_WEBHOOK_INCIDENTS ?? process.env.SLACK_WEBHOOK_ENGINEERING
    );
  if (channel === "prod")
    return process.env.SLACK_WEBHOOK_PROD ?? process.env.SLACK_WEBHOOK_ENGINEERING;
  return process.env.SLACK_WEBHOOK_ENGINEERING ?? process.env.SLACK_WEBHOOK_URL;
}

export interface SlackAlert {
  channel: SlackChannel;
  severity: SlackSeverity;
  title: string;
  message: string;
  /** Optional key/value pairs rendered as a `fields` block. */
  fields?: Record<string, string | number>;
  /** Optional link to a runbook or dashboard. */
  link?: { url: string; label: string };
}

export async function sendSlackAlert(alert: SlackAlert): Promise<void> {
  const url = webhookUrl(alert.channel);
  if (!url) {
    logger.warn({ alert }, "slack.no-webhook-configured");
    return;
  }
  const payload = {
    text: `*${alert.title}*`,
    attachments: [
      {
        color: COLOR[alert.severity],
        title: alert.title,
        text: alert.message,
        fields: alert.fields
          ? Object.entries(alert.fields).map(([title, value]) => ({
              title,
              value: String(value),
              short: true,
            }))
          : undefined,
        actions: alert.link
          ? [
              {
                type: "button",
                text: alert.link.label,
                url: alert.link.url,
              },
            ]
          : undefined,
        footer: `unGhost ${process.env.NODE_ENV ?? "dev"} · ${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.error({ status: res.status, alert }, "slack.webhook-failed");
    }
  } catch (e) {
    logger.error({ err: e, alert }, "slack.webhook-error");
  }
}

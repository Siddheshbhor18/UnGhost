import { MailOpen } from "lucide-react";
import { GlassBadge } from "@/components/glass";
import { listEmailTemplates } from "@/server/store";
import { emailMode } from "@/server/integrations/email";
import { EmailTemplatesClient } from "@/components/admin/EmailTemplatesClient";

export default async function AdminEmailsPage() {
  const templates = await listEmailTemplates();
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <GlassBadge tone="brand">
            <MailOpen size={11} /> Email templates
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Transactional emails
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Subject lines + bodies for every system-sent email. Variables wrapped in{" "}
            <code className="text-brand-primary">{`{{like_this}}`}</code>. Delivery via{" "}
            <span
              className={
                emailMode() === "live"
                  ? "text-emerald-700 font-semibold"
                  : "text-amber-700 font-semibold"
              }
            >
              Resend ({emailMode()})
            </span>
            .
          </p>
        </div>
      </div>

      <EmailTemplatesClient initial={templates} />
    </div>
  );
}

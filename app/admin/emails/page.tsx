
import { GlassBadge } from "@/components/glass";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { listEmailTemplates } from "@/server/store";
import { emailMode } from "@/server/integrations/email";
import { EmailTemplatesClient } from "@/components/admin/EmailTemplatesClient";

export default async function AdminEmailsPage() {
  const templates = await listEmailTemplates();
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <AdminPageHeader
          badge="Emails"
          title="Transactional emails"
          subtitle={
            <>
              Subject lines and bodies for every system-sent email. Variables
              wrapped in{" "}
              <code className="text-brand-primary">{`{{like_this}}`}</code>.
              Delivery via{" "}
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
            </>
          }
        />
      </div>

      <EmailTemplatesClient initial={templates} />
    </div>
  );
}

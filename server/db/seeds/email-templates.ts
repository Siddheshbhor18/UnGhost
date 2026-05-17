/**
 * Default transactional-email templates. Re-edited from admin/emails.
 */
import type { EmailTemplate } from "@/shared/types";

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl_verify",
    key: "verify_email",
    name: "Verify email",
    subject: "Verify your unGhost email",
    body: "Welcome to unGhost. Confirm your email: {{verifyUrl}}\n\nThis link expires in 24 hours.",
    variables: ["verifyUrl", "studentName"],
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "tpl_reset",
    key: "password_reset",
    name: "Password reset",
    subject: "Reset your unGhost password",
    body: "Reset your unGhost password: {{resetUrl}}\n\nThis link expires in 1 hour.",
    variables: ["resetUrl"],
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "tpl_sla_breach",
    key: "sla_breach_refund",
    name: "SLA breach + refund",
    subject: "Your application was ghosted — refund issued",
    body: "Hey {{studentName}}, the recruiter at {{companyName}} missed our {{slaHours}}h SLA on your application to {{jobTitle}}. Per the anti-ghost guarantee, we've issued a ₹250 credit to your wallet.",
    variables: ["studentName", "companyName", "slaHours", "jobTitle"],
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: "tpl_application_update",
    key: "application_advance",
    name: "Application advanced",
    subject: "{{companyName}} moved you to {{newStage}}",
    body: "Good news, {{studentName}} — your application to {{jobTitle}} at {{companyName}} just advanced to **{{newStage}}**. Next step: {{nextAction}}.",
    variables: ["studentName", "companyName", "jobTitle", "newStage", "nextAction"],
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "tpl_recruiter_welcome",
    key: "recruiter_welcome",
    name: "Recruiter welcome",
    subject: "Welcome to unGhost — your first 50 InMails are on us",
    body: "Welcome {{recruiterName}}. Your account at {{companyName}} comes with 50 free InMail credits. First mission to post? Use the AI JD parser at /recruiter/deploy.",
    variables: ["recruiterName", "companyName"],
    lastEditedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
];

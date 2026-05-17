/**
 * Default support tickets — inserted on first `npm run seed` so admin/support
 * isn't an empty page during dev. Idempotent: re-seeds only wipe + re-insert.
 */
import type { SupportTicket } from "@/shared/types";

export const DEFAULT_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "tkt_001",
    subject: "Payment debited but bootcamp not enrolled",
    category: "billing",
    status: "open",
    priority: "high",
    requesterEmail: "alice@demo.test",
    requesterRole: "student",
    bodyPreview:
      "PhonePe shows the ₹4,999 was debited 20 min ago, but the bootcamp still shows 'Enrol now'…",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "tkt_002",
    subject: "Recruiter posting fake jobs?",
    category: "abuse",
    status: "in_progress",
    priority: "urgent",
    requesterEmail: "rohan@demo.test",
    requesterRole: "student",
    bodyPreview:
      "Stark Industries posted 4 'Senior SDE' missions but the recruiter is asking for a fee to apply…",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    assignedToAdminId: "u_root",
  },
  {
    id: "tkt_003",
    subject: "DPDP — data export request",
    category: "account",
    status: "open",
    priority: "normal",
    requesterEmail: "priya@demo.test",
    requesterRole: "student",
    bodyPreview:
      "Under section 11 of DPDP Act, please export all my data within 30 days. Account email above.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "tkt_004",
    subject: "Cannot upload PDF resume > 5MB",
    category: "bug",
    status: "open",
    priority: "low",
    requesterEmail: "karthik@demo.test",
    requesterRole: "student",
    bodyPreview:
      "Resume PDF is 6.2MB. Upload button greys out with no message. Browser: Chrome 130.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "tkt_005",
    subject: "Suggest dark mode",
    category: "feature_request",
    status: "open",
    priority: "low",
    requesterEmail: "hr@stark.test",
    requesterRole: "recruiter",
    bodyPreview:
      "Spending hours on recruiter dashboard at night, glass-on-white burns eyes. Dark theme?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
  },
  {
    id: "tkt_006",
    subject: "Refund processed — thanks",
    category: "billing",
    status: "resolved",
    priority: "low",
    requesterEmail: "raj@demo.test",
    requesterRole: "student",
    bodyPreview:
      "Got the SLA-breach refund of ₹250 yesterday. Thanks for the fast turnaround.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    assignedToAdminId: "u_root",
  },
];

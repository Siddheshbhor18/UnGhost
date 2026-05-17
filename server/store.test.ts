import { describe, expect, it } from "vitest";
import {
  createSupportTicket,
  getSupportTicketById,
  listSupportTickets,
  updateSupportTicket,
  listEmailTemplates,
  updateEmailTemplate,
} from "./store";
import { EmailTemplateModel } from "./db/models";
import { DEFAULT_EMAIL_TEMPLATES } from "./db/seeds/email-templates";

describe("server.store.supportTickets", () => {
  it("round-trips a ticket through Mongo", async () => {
    const t = await createSupportTicket({
      subject: "Test billing issue",
      category: "billing",
      status: "open",
      priority: "high",
      requesterEmail: "alice@demo.test",
      requesterRole: "student",
      bodyPreview: "Payment debited but enrolment missing.",
    });
    expect(t.id).toMatch(/^tkt_/);

    const fetched = await getSupportTicketById(t.id);
    expect(fetched?.subject).toBe("Test billing issue");
  });

  it("filters by status", async () => {
    await createSupportTicket({
      subject: "A",
      category: "bug",
      status: "open",
      priority: "low",
      requesterEmail: "a@x.com",
      requesterRole: "student",
      bodyPreview: "x",
    });
    await createSupportTicket({
      subject: "B",
      category: "bug",
      status: "resolved",
      priority: "low",
      requesterEmail: "b@x.com",
      requesterRole: "student",
      bodyPreview: "y",
    });
    const open = await listSupportTickets({ status: "open" });
    expect(open).toHaveLength(1);
    expect(open[0].subject).toBe("A");
  });

  it("updateSupportTicket sets status + bumps updatedAt", async () => {
    const t = await createSupportTicket({
      subject: "Z",
      category: "bug",
      status: "open",
      priority: "low",
      requesterEmail: "z@x.com",
      requesterRole: "student",
      bodyPreview: "x",
    });
    const beforeTs = t.updatedAt;
    await new Promise((r) => setTimeout(r, 10));
    await updateSupportTicket(t.id, { status: "in_progress" });
    const after = await getSupportTicketById(t.id);
    expect(after?.status).toBe("in_progress");
    expect(after?.updatedAt).not.toBe(beforeTs);
  });
});

describe("server.store.emailTemplates", () => {
  it("lists templates after seeding", async () => {
    // Seed defaults manually since global setup wipes between tests.
    await EmailTemplateModel.insertMany(
      DEFAULT_EMAIL_TEMPLATES.map((t) => ({ ...t, _id: t.id })),
    );
    const list = await listEmailTemplates();
    expect(list.length).toBe(DEFAULT_EMAIL_TEMPLATES.length);
    expect(list[0].key).toBeDefined();
  });

  it("updateEmailTemplate rotates subject + bumps lastEditedAt", async () => {
    await EmailTemplateModel.insertMany(
      DEFAULT_EMAIL_TEMPLATES.slice(0, 1).map((t) => ({ ...t, _id: t.id })),
    );
    const id = DEFAULT_EMAIL_TEMPLATES[0].id;
    await updateEmailTemplate(id, { subject: "Rotated subject" });
    const list = await listEmailTemplates();
    const found = list.find((t) => t.id === id);
    expect(found?.subject).toBe("Rotated subject");
  });
});

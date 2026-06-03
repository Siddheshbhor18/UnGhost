import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "Refund Policy · unGhost" };
export const revalidate = 86400;

export default function RefundPolicy() {
  return (
    <LegalShell
      title="Refund Policy"
      badge="All sales final"
      effectiveDate="1 May 2026"
      intro="We keep the refund policy short on purpose. Read this before you check out — you'll see the same wording at the payment step."
    >
      <Section title="Premium — one payment, non-refundable">
        <p className="text-base">
          <strong>
            Premium is a single one-time purchase and is non-refundable. We
            do not issue money refunds.
          </strong>
        </p>
        <p>
          One payment of ₹4,999 (plus 18% GST, collected at checkout) unlocks
          everything permanently — unlimited applications, AI Coach, Q&amp;A,
          and every Bootcamp included. There is no recurring subscription and
          nothing to cancel. Access stays active for life.
        </p>
        <p>
          You consent to this at checkout by ticking the &ldquo;I understand
          this purchase is final and non-refundable&rdquo; box. We record the
          timestamp, your IP address, and the Terms version you accepted. This
          consent is used as evidence in any chargeback dispute.
        </p>
      </Section>

      <Section title="Cancelled live sessions">
        <p>
          Bootcamps are included with Premium — you don&apos;t pay separately
          for any single Bootcamp, so there is no per-Bootcamp amount to refund.
        </p>
        <p>
          If an instructor cancels a live session, we reschedule it or provide
          the recording. Your access to every other Bootcamp and to the rest of
          the platform is unaffected, so no monetary refund applies.
        </p>
      </Section>

      <Section title="Recruiter sponsorships">
        <p>
          When a recruiter sponsors a Bootcamp for a candidate, the
          sponsorship is non-refundable once the candidate accepts. Before
          acceptance (30-day window), the recruiter can request a refund
          minus a 10% processing fee.
        </p>
      </Section>

      <Section title="Disputed charges + chargebacks">
        <p>
          If you believe a charge is wrong (duplicate, unauthorised), email{" "}
          <a
            href="mailto:billing@unghost.com"
            className="text-brand-primary underline"
          >
            billing@unghost.com
          </a>{" "}
          within 7 days. We refund duplicate charges immediately.
        </p>
        <p>
          Filing a chargeback with your bank/UPI provider as a workaround for
          the no-refund policy → your account is permanently banned. We
          defend chargebacks with the consent record described above.
        </p>
      </Section>

      <Section title="Tax invoices (GST)">
        <p>
          Every purchase ships an 18% GST invoice (HSN 999293) on top of the
          base price. Invoices auto-email and are downloadable from{" "}
          <code>Settings → Invoices</code>. We file GSTR-1 monthly.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Billing questions:{" "}
          <a
            href="mailto:billing@unghost.com"
            className="text-brand-primary underline"
          >
            billing@unghost.com
          </a>{" "}
          · 4-hour response SLA. Genuine technical issues with Bootcamp
          access: tap <code>[Contact Support]</code> in{" "}
          <code>My Bootcamps</code>.
        </p>
      </Section>
    </LegalShell>
  );
}

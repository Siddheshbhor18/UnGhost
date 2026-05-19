import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "Refund Policy · unGhost" };
export const revalidate = 86400;

export default function RefundPolicy() {
  return (
    <LegalShell
      title="Refund Policy"
      badge="All sales final · with one exception"
      effectiveDate="1 May 2026"
      intro="We keep the refund policy short on purpose. Read this before you check out — you'll see the same wording at the payment step."
    >
      <Section title="Bootcamp purchases — non-refundable">
        <p className="text-base">
          <strong>
            All Bootcamp purchases are final. We do not issue refunds.
          </strong>
        </p>
        <p>
          You consent to this at checkout by ticking the &ldquo;I understand
          all Bootcamp purchases are final and non-refundable&rdquo; box. We
          record the timestamp, your IP address, and the Terms version you
          accepted. This consent is used as evidence in any chargeback
          dispute.
        </p>
        <p>
          We&apos;re strict about this for two reasons: (1) Bootcamps unlock
          instantly — you get the content the moment you pay. (2) Refund
          fraud destroys the economics for instructors who deliver the
          content. Strict policy → better content quality.
        </p>
      </Section>

      <Section title="The one exception · goodwill credit">
        <p>
          If the instructor cancels the live session and cannot reschedule
          within 60 days, we issue you a{" "}
          <strong>goodwill credit of equal value</strong> usable toward any
          other Bootcamp.
        </p>
        <p>
          This is the only narrow exception — you genuinely received nothing
          in this scenario. It&apos;s a credit, not cash. Auto-triggered;
          surfaces in <code>Settings → Subscription</code>.
        </p>
      </Section>

      <Section title="Subscriptions">
        <p>
          Subscription tiers (Hunt / Stretch) cancel any time in{" "}
          <code>Settings → Subscription</code>.
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Within 7 days of charge:</strong> pro-rated refund of
            unused subscription time.
          </li>
          <li>
            <strong>After 7 days:</strong> no refunds. You keep access until
            the billing period ends.
          </li>
        </ul>
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
          Every Bootcamp purchase ships an 18% GST invoice (HSN 999293).
          Invoices auto-email and are downloadable from{" "}
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

import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "DPDP Act compliance · unGhost" };

export default function DPDPCompliance() {
  return (
    <LegalShell
      title="DPDP Act compliance"
      badge="Digital Personal Data Protection Act, 2023"
      effectiveDate="1 May 2026"
      intro="A plain-English summary of how unGhost complies with the Digital Personal Data Protection Act of India. Full legal detail lives in the Privacy Policy."
    >
      <Section title="Data residency · ap-south-1 Mumbai">
        <p>
          Every byte of Indian-user personal data lives in MongoDB Atlas
          Mumbai. Read replicas in Singapore are anonymised + non-PII for
          analytics. No cross-border PII transfer without your explicit
          consent.
        </p>
      </Section>

      <Section title="Your rights">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Right to access:</strong> download every byte we hold on
            you. <code>Settings → Download my data</code> ships a JSON +
            CSV bundle within 30 days (instant in practice).
          </li>
          <li>
            <strong>Right to correction:</strong>{" "}
            <code>Profile → Edit</code> covers most. For anything else:{" "}
            <a
              href="mailto:dpo@unghost.com"
              className="text-brand-primary underline"
            >
              dpo@unghost.com
            </a>
            .
          </li>
          <li>
            <strong>Right to erasure:</strong>{" "}
            <code>Settings → Delete my account</code>. 30-day grace, then PII
            anonymisation preserving the financial + audit trail
            (legally required).
          </li>
          <li>
            <strong>Right to grievance:</strong> escalate to our DPO. If
            unresolved, file with the Data Protection Board of India.
          </li>
          <li>
            <strong>Right to nominate:</strong> in case of incapacity/death,
            you can nominate someone to exercise your rights. Email{" "}
            <a
              href="mailto:dpo@unghost.com"
              className="text-brand-primary underline"
            >
              dpo@unghost.com
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="Lawful basis for processing">
        <p>
          We process your data under two grounds:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Consent:</strong> service communications, marketing
            (opt-in), search visibility, AI Coach memory.
          </li>
          <li>
            <strong>Certain legitimate uses:</strong> running the marketplace,
            fraud prevention, compliance with Indian law (GST, TDS,
            audit-trail retention).
          </li>
        </ul>
        <p>
          You can revoke consent at any time in{" "}
          <code>Settings → Privacy</code>. Revoking consent for service
          communications limits platform functionality.
        </p>
      </Section>

      <Section title="Consent receipts">
        <p>
          Every consent capture (signup, payment, marketing opt-in) is
          recorded with timestamp + IP + ToS version. You can view your
          consent history in <code>Settings → Privacy → Consent log</code>{" "}
          (coming soon).
        </p>
      </Section>

      <Section title="Breach notification">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            Detected breach → notify Data Protection Board within{" "}
            <strong>72 hours</strong>.
          </li>
          <li>
            Affected users notified immediately via email + in-app banner.
          </li>
          <li>
            Public post-mortem on <code>status.unghost.com</code> within 7
            days.
          </li>
        </ul>
      </Section>

      <Section title="Data Protection Officer">
        <p>
          <strong>DPO:</strong> Anika Rao ·{" "}
          <a
            href="mailto:dpo@unghost.com"
            className="text-brand-primary underline"
          >
            dpo@unghost.com
          </a>{" "}
          · response SLA: 7 business days for any DPDP request.
        </p>
        <p>
          <strong>Registered office:</strong> unGhost Technologies Pvt Ltd,
          Mumbai · CIN: UXXXXXMH2025PTCXXXXXX.
        </p>
      </Section>

      <Section title="Retention">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Profile + applications:</strong> until you delete your
            account. 30-day grace, then anonymised.
          </li>
          <li>
            <strong>Financial records (transactions, GST):</strong> 7 years
            per Indian law. Anonymised from your side but linked internally.
          </li>
          <li>
            <strong>Audit logs:</strong> 7-year retention. Immutable.
          </li>
          <li>
            <strong>Resume files:</strong> 30 days after last activity unless
            you sign back in.
          </li>
          <li>
            <strong>Bootcamp content:</strong> 1 year minimum so
            you can access purchased material.
          </li>
        </ul>
      </Section>

      <Section title="Third-party processors">
        <p>
          We share data with vetted processors only when necessary to run the
          platform. All operate under data-processing agreements:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>MongoDB Atlas (Mumbai) — primary database</li>
          <li>Cloudflare R2 (Mumbai) — file storage</li>
          <li>Upstash Redis (Mumbai) — session cache</li>
          <li>Groq + Google Gemini — AI inference (no model training)</li>
          <li>PhonePe — payments (UPI / QR)</li>
          <li>Resend — transactional email</li>
        </ul>
      </Section>
    </LegalShell>
  );
}

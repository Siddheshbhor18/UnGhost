import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "Privacy Policy · unGhost" };

export default function PrivacyPolicy() {
  return (
    <LegalShell
      title="Privacy Policy"
      badge="DPDP Act compliant"
      effectiveDate="1 May 2026"
      intro="We collect the minimum data needed to run the platform — and you can export or delete every byte at any time. Your data lives in Mumbai (ap-south-1)."
    >
      <Section title="1. What we collect">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Account:</strong> name, email, phone, password hash, role.
          </li>
          <li>
            <strong>Profile:</strong> skills, work history, city, work mode,
            resume file. All editable.
          </li>
          <li>
            <strong>Applications:</strong> jobs you applied to, assessment
            responses, AI grading notes.
          </li>
          <li>
            <strong>Bootcamps:</strong> enrollments, lesson progress, skill
            checks, assignments.
          </li>
          <li>
            <strong>Messages:</strong> AI Coach chats, recruiter conversations
            (post Stage 1), InMail threads.
          </li>
          <li>
            <strong>Payments:</strong> PhonePe transaction IDs, GST invoice
            data, consent timestamp + IP for chargeback defence.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <p>
          <strong>To run the platform:</strong> match you to jobs, grade
          assessments, deliver bootcamp content, track applications, enforce
          SLAs, send notifications.
        </p>
        <p>
          <strong>To improve the platform:</strong> aggregate skill-gap analytics
          (no PII), telemetry on drop-off points, content quality signals.
        </p>
        <p>
          <strong>To comply with the law:</strong> GST invoices, TDS for
          instructor payouts, breach notification, audit logs (7-year
          retention).
        </p>
        <p>
          <strong>We do not sell your data.</strong> Recruiters see your profile
          per your visibility settings — not third parties.
        </p>
      </Section>

      <Section title="3. Where it lives">
        <p>
          Primary database: MongoDB Atlas in <strong>ap-south-1 (Mumbai)</strong>
          . Read replicas in ap-southeast-1 (Singapore) are anonymised for
          analytics only — no PII crosses Indian borders without your
          explicit consent.
        </p>
        <p>
          Resume files + video content: Cloudflare R2 (Mumbai region). AI
          inference: Anthropic + Google Vertex AI — request/response not used
          for model training.
        </p>
      </Section>

      <Section title="4. Your rights (DPDP Act)">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Access:</strong> download a JSON bundle of everything we
            store via <code>Settings → Download my data</code>.
          </li>
          <li>
            <strong>Correction:</strong> edit any field via{" "}
            <code>Profile → Edit</code>. Or email{" "}
            <a
              href="mailto:dpo@unghost.com"
              className="text-brand-primary underline"
            >
              dpo@unghost.com
            </a>
            .
          </li>
          <li>
            <strong>Erasure:</strong> 30-day soft delete via{" "}
            <code>Settings → Danger zone</code>. After 30 days PII is
            anonymised; financial + audit trails preserved per Indian law.
          </li>
          <li>
            <strong>Portability:</strong> the JSON bundle is machine-readable.
          </li>
          <li>
            <strong>Withdraw consent:</strong> revoke marketing /
            search-visibility at any time in Settings.
          </li>
          <li>
            <strong>Complain:</strong> Data Protection Board of India · DPO at
            unGhost (
            <a
              href="mailto:dpo@unghost.com"
              className="text-brand-primary underline"
            >
              dpo@unghost.com
            </a>
            ).
          </li>
        </ul>
      </Section>

      <Section title="5. Cookies + tracking">
        <p>
          <strong>Essential:</strong> session, CSRF, consent record. Always on.
        </p>
        <p>
          <strong>Analytics:</strong> PostHog self-hosted in India. Opt-out via
          cookie banner. No third-party ad networks.
        </p>
      </Section>

      <Section title="6. Breach notification">
        <p>
          If we detect a personal-data breach we notify the Data Protection
          Board of India within <strong>72 hours</strong> and affected users
          immediately. We publish a public post-mortem on{" "}
          <code>status.unghost.com</code>.
        </p>
      </Section>

      <Section title="7. Children">
        <p>
          unGhost is for users aged 18 and above. We do not knowingly collect
          data from minors. If you believe we have, email{" "}
          <a
            href="mailto:dpo@unghost.com"
            className="text-brand-primary underline"
          >
            dpo@unghost.com
          </a>{" "}
          and we will purge it.
        </p>
      </Section>

      <Section title="8. Changes to this policy">
        <p>
          Material changes are emailed to all users with 30 days notice. Minor
          edits are dated. Version history is preserved — request a prior
          version from{" "}
          <a
            href="mailto:legal@unghost.com"
            className="text-brand-primary underline"
          >
            legal@unghost.com
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

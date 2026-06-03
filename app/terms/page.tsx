import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "Terms of Service · unGhost" };
// Legal copy changes monthly at most — daily revalidate is plenty.
export const revalidate = 86400;

export default function TermsOfService() {
  return (
    <LegalShell
      title="Terms of Service"
      badge="ToS · v1.0"
      effectiveDate="1 May 2026"
      intro="By creating an account you agree to these Terms. Plain English first — legalese second."
    >
      <Section title="1. The deal in one sentence">
        <p className="text-base">
          unGhost matches you to jobs / bootcamps · recruiters commit to public
          SLAs · miss the SLA, your application slot is returned (it won't count
          against your limit) · misuse the
          platform, your account gets suspended or banned.
        </p>
      </Section>

      <Section title="2. Account rules">
        <ul className="list-disc list-inside space-y-1.5">
          <li>One email = one role. Career switchers need a new email.</li>
          <li>You are responsible for keeping your password secret.</li>
          <li>
            We may suspend or ban accounts for: fabricated resumes, harassment,
            recruiter ghosting beyond threshold, fraud, scraping, AI-generated
            assessment cheating.
          </li>
          <li>
            Admin suspension is appealable via{" "}
            <a
              href="mailto:appeals@unghost.com"
              className="text-brand-primary underline"
            >
              appeals@unghost.com
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="3. The anti-ghosting promise">
        <p>
          Every recruiter posts a per-stage SLA (24h / 48h / 72h). If they miss
          it for an application:
        </p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            Your application slot is returned automatically — it won&apos;t
            count against your limit. (No money changes hands; applications are
            credits, not paid fees.)
          </li>
          <li>Their public Ghosting Rate increments.</li>
          <li>
            Persistent breaches → visibility throttling → posting suspension.
          </li>
        </ul>
        <p>
          This promise is structural — built into the product, not a marketing
          claim.
        </p>
      </Section>

      <Section title="4. Free + paid tiers">
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            <strong>Free:</strong> 2 lifetime applications to try the platform.
            Applications refunded after an SLA breach don&apos;t count against
            this.
          </li>
          <li>
            <strong>Premium (₹4,999, one-time lifetime):</strong> unlimited
            applications + AI Coach + Q&amp;A + every Bootcamp included. Pay
            once, no renewals.
          </li>
          <li>
            <strong>Recruiters:</strong> free forever for posting and hiring.
          </li>
        </ul>
        <p>
          Premium is a one-time lifetime purchase — nothing auto-renews. There
          is no separate per-Bootcamp fee: one payment includes every Bootcamp.
        </p>
      </Section>

      <Section title="5. Purchases — non-refundable">
        <p>
          The Premium purchase is <strong>final and non-refundable</strong>. You
          agree to this at checkout. Because every Bootcamp is bundled into
          Premium, there is no per-Bootcamp amount to refund. If an instructor
          cancels a live session, we reschedule it or provide the recording;
          your access to everything else is unaffected. Full details:{" "}
          <a href="/refund-policy" className="text-brand-primary underline">
            Refund Policy
          </a>
          .
        </p>
      </Section>

      <Section title="6. Content you submit">
        <p>
          You retain ownership of: your resume, profile data, assessment
          responses, bootcamp assignments, messages.
        </p>
        <p>
          You grant us a non-exclusive licence to: display your profile to
          recruiters per your visibility settings · grade your assessments via
          AI · feature top-10 leaderboard submissions (anonymised by default;
          named only with opt-in).
        </p>
        <p>
          AI-generated or plagiarised assignments → permanent profile flag
          visible to recruiters. Don&apos;t do this.
        </p>
      </Section>

      <Section title="7. Recruiter conduct">
        <p>
          Recruiters must: post real jobs · respond within their SLA · provide
          AI-or-human feedback on rejection · not contact candidates outside
          the platform until past Stage 1.
        </p>
        <p>
          Recruiters must not: discriminate (caste, religion, gender, age,
          disability) · use AI to spam-reject without review · use the database
          for non-hiring outreach.
        </p>
      </Section>

      <Section title="8. Disputes + jurisdiction">
        <p>
          Governed by the laws of India. Disputes resolved in Mumbai courts.
          For consumer disputes you also retain rights under the Consumer
          Protection Act, 2019.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          unGhost is a marketplace — we don&apos;t guarantee employment,
          interview outcomes, or hiring decisions. Our liability for any claim
          is capped at the amount you paid us in the 12 months preceding the
          claim, or ₹10,000, whichever is higher.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          Material changes: 30 days email notice. Continued use after the
          notice = acceptance.
        </p>
      </Section>
    </LegalShell>
  );
}

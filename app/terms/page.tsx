import { LegalShell, Section } from "@/components/legal/LegalShell";

export const metadata = { title: "Terms of Service · unGhost" };

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
          SLAs · miss the SLA, your application credit refunds · misuse the
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
          <li>Your application credit is refunded automatically.</li>
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
            <strong>Free:</strong> 5 applications per calendar month · 15 AI
            Coach messages per day. Resets on the 1st.
          </li>
          <li>
            <strong>Hunt (₹299/mo):</strong> unlimited applications + unlimited
            AI Coach + saved search alerts.
          </li>
          <li>
            <strong>Stretch (₹599/mo):</strong> Hunt + 1 free Bootcamp / month.
          </li>
          <li>
            <strong>Recruiters:</strong> free forever for posting and hiring.
          </li>
        </ul>
        <p>
          Subscriptions auto-renew. Cancel any time in{" "}
          <code>Settings → Subscription</code>. Refunds for unused subscription
          time are pro-rated within 7 days of charge; no refunds after.
        </p>
      </Section>

      <Section title="5. Bootcamps — non-refundable">
        <p>
          All Bootcamp purchases are <strong>final and non-refundable</strong>.
          You agree to this at checkout. The one exception: instructor cancels
          the live session and cannot reschedule within 60 days → goodwill
          credit (not cash) usable on any other Bootcamp. Full details:{" "}
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
          For consumer disputes (Bootcamp purchases) you also retain rights
          under the Consumer Protection Act, 2019.
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

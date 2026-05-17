"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "What does \"anti-ghosting SLA\" actually mean?",
    a: "Every recruiter commits to a response time per pipeline stage — 24, 48, or 72 hours. If they miss it, your application credit is refunded and the recruiter's public Ghosting Rate increments. Reputational accountability is built into the product.",
  },
  {
    q: "Is unGhost free to use?",
    a: "Free tier: 5 applications per month, 15 AI Coach messages per day. Paid Hunt and Stretch tiers unlock unlimited applications and full AI Coach. Recruiters post and hire for free — no platform fees.",
  },
  {
    q: "Are Bootcamp purchases refundable?",
    a: "No. All Bootcamp sales are final and non-refundable. You consent to this at checkout, persisted with timestamp + IP for legal protection. The single exception: if the instructor cancels a live session and cannot reschedule within 60 days, we issue a goodwill credit usable on another Bootcamp.",
  },
  {
    q: "How does the AI grade my assessment?",
    a: "MCQ questions are auto-graded. Scenario questions are graded by Claude with a rubric covering depth, evidence, and trade-offs. Recruiters see your raw score plus AI grading notes — no black box.",
  },
  {
    q: "Can recruiters see my name and photo before I'm shortlisted?",
    a: "Your choice. Pick \"named\" or \"anonymous\" applications during onboarding. Anonymous candidates reveal name and photo only after advancing past Stage 1.",
  },
  {
    q: "What happens if I fail an assessment?",
    a: "You don't burn an application slot. AI Coach surfaces 2–3 Bootcamps that close the specific gap. Once you complete the Bootcamp (Verified Skill badge issued), the assessment is eligible for retry.",
  },
  {
    q: "Where is my data stored?",
    a: "All Indian user data lives in MongoDB Atlas Mumbai (ap-south-1) — DPDP Act compliant. Cross-border replicas are read-only and non-PII. You can export or delete your data anytime via Settings → Privacy.",
  },
  {
    q: "How is unGhost different from Naukri or LinkedIn?",
    a: "Naukri and LinkedIn optimise for volume — apply into a void. We optimise for response: every application gets either a real recruiter reply or a refund. Plus AI-graded assessments, embedded skill bootcamps, and a public leaderboard recruiters hire from.",
  },
];

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((f, i) => {
        const open = openIdx === i;
        return (
          <div
            key={i}
            className={`rounded-2xl border transition ${
              open
                ? "bg-white/70 border-brand-primary/30 shadow-glass"
                : "bg-white/50 border-white/60"
            }`}
          >
            <button
              onClick={() => setOpenIdx(open ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-display font-semibold text-brand-ink">
                {f.q}
              </span>
              <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary">
                {open ? <Minus size={14} /> : <Plus size={14} />}
              </span>
            </button>
            {open && (
              <div className="px-5 pb-5 text-sm text-brand-muted leading-relaxed">
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  Variants,
} from "framer-motion";

const FAQS = [
  {
    q: "What does \"anti-ghosting SLA\" actually mean?",
    a: "Every recruiter commits to a response time per pipeline stage: 24, 48, or 72 hours. If they miss it, your application credit is refunded and the recruiter's public Ghosting Rate increments. Reputational accountability is built into the product.",
  },
  {
    q: "Is unGhost free to use?",
    a: "Free tier gives you 2 lifetime applications. For unlimited applications plus AI Coach and Q&A, the Jobs plan is ₹149 for 3 months or ₹299 for a year. Bootcamp courses are separate: ₹4,999 each (or ₹11,999 for all six). Recruiters post and hire for free.",
  },
  {
    q: "Are payments refundable?",
    a: "Jobs plans (₹149 for 3 months, ₹299 for a year) and bootcamp courses (₹4,999 each, or ₹11,999 for all six) are final sales, with consent recorded at checkout. Buying AI or GTM Engineering unlocks Marketing, Sales, and Entrepreneurship free; buying any one of Entrepreneurship, Freelancing, Marketing, or Sales unlocks the other three. If an instructor cancels a live session, we reschedule it or share the recording.",
  },
  {
    q: "How does the AI grade my assessment?",
    a: "MCQ questions are auto-graded. Scenario questions are graded by Claude with a rubric covering depth, evidence, and trade-offs. Recruiters see your raw score plus AI grading notes, no black box.",
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
    a: "All Indian user data lives in MongoDB Atlas Mumbai (ap-south-1), DPDP Act compliant. Cross-border replicas are read-only and non-PII. You can export or delete your data anytime via Settings → Privacy.",
  },
  {
    q: "How is unGhost different from Naukri or LinkedIn?",
    a: "Naukri and LinkedIn optimise for volume, so you apply into a void. We optimise for response: every application gets either a real recruiter reply or a refund. Plus AI-graded assessments, embedded skill bootcamps, and a public leaderboard recruiters hire from.",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="max-w-3xl mx-auto space-y-3"
      variants={reduce ? undefined : containerVariants}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "visible"}
      viewport={{ once: true, amount: 0.1 }}
    >
      {FAQS.map((f, i) => {
        const open = openIdx === i;
        return (
          <motion.div
            key={i}
            variants={reduce ? undefined : itemVariants}
            className={`rounded-2xl border transition-colors ${
              open
                ? "bg-white/80 border-brand-500/30 shadow-elev-2"
                : "bg-white/50 border-neutral-200 hover:border-neutral-300"
            }`}
            layout={!reduce}
            transition={
              reduce
                ? undefined
                : { layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
            }
          >
            <button
              onClick={() => setOpenIdx(open ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={open}
            >
              <span className="font-display font-semibold text-neutral-900">
                {f.q}
              </span>
              <motion.span
                className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-brand-500/10 text-brand-500"
                animate={reduce ? undefined : { rotate: open ? 45 : 0 }}
                transition={
                  reduce
                    ? undefined
                    : { type: "spring", stiffness: 260, damping: 20 }
                }
              >
                <Plus size={14} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={
                    reduce ? undefined : { height: "auto", opacity: 1 }
                  }
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={
                    reduce
                      ? undefined
                      : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
                  }
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-5 pb-5 text-sm text-neutral-500 leading-relaxed">
                    {f.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

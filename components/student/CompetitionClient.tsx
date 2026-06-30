"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/shared/types";
import { CompetitionHero } from "./competition/CompetitionHero";
import { CompetitionTimeline } from "./competition/CompetitionTimeline";
import { CompetitionBonuses } from "./competition/CompetitionBonuses";
import { RegistrationForm } from "./competition/RegistrationForm";
import { SubmissionHub } from "./competition/SubmissionHub";
import { SubmissionConfirmation } from "./competition/SubmissionConfirmation";

/* ── localStorage Keys ── */
const LS_KEY_STEP = "ug_comp_step";
const LS_KEY_REG = "ug_comp_reg_data";
const LS_KEY_SUB = "ug_comp_sub_data";

/* ── Types ── */
type CompetitionStep = "landing" | "registering" | "registered_hub" | "submitted";

interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  course: string;
  year: string;
  githubId: string;
  linkedinId: string;
}

interface SubmissionData {
  githubRepo: string;
  liveLink: string;
  techStack: string;
  breakdown: string;
}

/* ── Helpers ── */
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded — non-fatal */
  }
}

function clearCompetitionStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY_STEP);
  localStorage.removeItem(LS_KEY_REG);
  localStorage.removeItem(LS_KEY_SUB);
}

interface CompetitionClientProps {
  user: User;
}

/**
 * CompetitionClient — Orchestrator for the hackathon competition page.
 *
 * Manages the lifecycle: Landing → Registering → Registered Hub → Submitted.
 * All state is persisted via localStorage (no backend modifications).
 *
 * Delegates rendering to focused sub-components:
 * - CompetitionHero (landing page hero with ghost animation)
 * - CompetitionTimeline (how it works)
 * - CompetitionBonuses (social media bonus points)
 * - RegistrationForm (two-step form with confetti)
 * - SubmissionHub (project submission form)
 * - SubmissionConfirmation (post-submission summary)
 */
export function CompetitionClient({ user }: CompetitionClientProps): JSX.Element {
  const [step, setStep] = useState<CompetitionStep>("landing");
  const [regData, setRegData] = useState<RegistrationData>({
    name: user.name ?? "",
    email: user.email ?? "",
    phone: "",
    collegeName: "",
    course: "",
    year: "",
    githubId: "",
    linkedinId: "",
  });
  const [subData, setSubData] = useState<SubmissionData>({
    githubRepo: "",
    liveLink: "",
    techStack: "",
    breakdown: "",
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedStep = loadFromStorage<CompetitionStep>(LS_KEY_STEP, "landing");
    const savedReg = loadFromStorage<RegistrationData | null>(LS_KEY_REG, null);
    const savedSub = loadFromStorage<SubmissionData | null>(LS_KEY_SUB, null);

    if (savedReg) setRegData(savedReg);
    if (savedSub) setSubData(savedSub);
    setStep(savedStep);
  }, []);

  // Persist step changes
  const transitionTo = useCallback((next: CompetitionStep) => {
    setStep(next);
    saveToStorage(LS_KEY_STEP, next);
  }, []);

  // Registration complete handler
  const handleRegistrationComplete = useCallback(
    (data: RegistrationData) => {
      setRegData(data);
      saveToStorage(LS_KEY_REG, data);
      transitionTo("registered_hub");
    },
    [transitionTo],
  );

  // Submission complete handler
  const handleSubmissionComplete = useCallback(
    (data: SubmissionData) => {
      setSubData(data);
      saveToStorage(LS_KEY_SUB, data);
      transitionTo("submitted");
    },
    [transitionTo],
  );

  // Reset simulation
  const handleReset = useCallback(() => {
    clearCompetitionStorage();
    setRegData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: "",
      collegeName: "",
      course: "",
      year: "",
      githubId: "",
      linkedinId: "",
    });
    setSubData({ githubRepo: "", liveLink: "", techStack: "", breakdown: "" });
    setStep("landing");
  }, [user.name, user.email]);

  return (
    <main className="relative min-h-screen bg-neutral-25">
      {/* ─── Landing State ─── */}
      {step === "landing" && (
        <>
          <CompetitionHero onRegister={() => transitionTo("registering")} />
          <CompetitionTimeline />
          <CompetitionBonuses />

          {/* Final CTA strip */}
          <section className="mx-auto max-w-5xl px-4 pb-16">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/5 rounded-2xl blur-2xl" />
              <div className="relative bg-white/80 backdrop-blur-sm border border-brand-100 rounded-2xl p-8 md:p-10 text-center space-y-4">
                <h2 className="font-display font-extrabold text-2xl md:text-3xl text-neutral-950 tracking-tight">
                  Ready to build?
                </h2>
                <p className="text-body-sm text-neutral-500 max-w-lg mx-auto">
                  Register now and start building. You have 7 days to ship a product.
                  No teams. No restrictions on stack. Just build.
                </p>
                <button
                  type="button"
                  onClick={() => transitionTo("registering")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm shadow-md hover:bg-brand-600 active:scale-[0.97] transition-all duration-160"
                >
                  Register Now
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ─── Registration Form State ─── */}
      {step === "registering" && (
        <RegistrationForm
          prefillName={user.name ?? ""}
          prefillEmail={user.email ?? ""}
          onComplete={handleRegistrationComplete}
          onCancel={() => transitionTo("landing")}
        />
      )}

      {/* ─── Submission Hub State ─── */}
      {step === "registered_hub" && (
        <SubmissionHub
          registrationName={regData.name}
          registrationCollege={regData.collegeName}
          existingSubmission={subData.githubRepo ? subData : undefined}
          onSubmit={handleSubmissionComplete}
          onReset={handleReset}
        />
      )}

      {/* ─── Submitted Confirmation State ─── */}
      {step === "submitted" && (
        <SubmissionConfirmation
          registrationName={regData.name}
          registrationCollege={regData.collegeName}
          githubRepo={subData.githubRepo}
          liveLink={subData.liveLink}
          onEditSubmission={() => transitionTo("registered_hub")}
          onReset={handleReset}
        />
      )}
    </main>
  );
}

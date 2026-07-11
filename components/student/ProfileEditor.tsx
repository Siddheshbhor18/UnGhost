"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Check,
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import { ResumeReupload } from "@/components/student/ResumeReupload";
import type {
  HistoryEntry,
  StudentProfile,
  Trajectory,
  User,
} from "@/shared/types";

interface Props {
  user: User;
}

const TRAJECTORIES: Array<{ value: Trajectory; label: string; desc: string }> = [
  {
    value: "actively_hunting",
    label: "Actively hunting",
    desc: "Open search · top of recruiter feeds",
  },
  {
    value: "casually_exploring",
    label: "Casually exploring",
    desc: "Visible but flagged passive",
  },
  {
    value: "open_to_magic",
    label: "Open to magic",
    desc: "Visible · surprise-me tag",
  },
];

const REMOTE: Array<"remote" | "hybrid" | "onsite"> = [
  "remote",
  "hybrid",
  "onsite",
];

export function ProfileEditor({ user }: Props) {
  const router = useRouter();
  const initial = user.profile!;
  const [draft, setDraft] = useState<Partial<StudentProfile>>({
    alias: initial.alias,
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone ?? "",
    city: initial.city ?? "",
    remotePref: initial.remotePref,
    trajectory: initial.trajectory,
    skills: initial.skills,
    history: initial.history ?? [],
    yearsExperience: initial.yearsExperience,
  });
  const [skillInput, setSkillInput] = useState("");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const debounce = useRef<NodeJS.Timeout | null>(null);

  function patch<K extends keyof StudentProfile>(
    key: K,
    val: StudentProfile[K],
  ) {
    setDraft((d) => {
      const next = { ...d, [key]: val };
      scheduleAutosave(next);
      return next;
    });
  }

  function scheduleAutosave(next: Partial<StudentProfile>) {
    if (debounce.current) clearTimeout(debounce.current);
    setSavingState("saving");
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/student/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(next),
        });
        if (res.ok) {
          setSavingState("saved");
          setTimeout(() => setSavingState("idle"), 1500);
        } else {
          setSavingState("idle");
        }
      } catch {
        setSavingState("idle");
      }
    }, 700);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    const current = draft.skills ?? [];
    if (current.includes(s)) return;
    patch("skills", [...current, s]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    patch(
      "skills",
      (draft.skills ?? []).filter((x) => x !== s),
    );
  }

  function addHistory() {
    const next: HistoryEntry = {
      id: `h_${Date.now().toString(36)}`,
      title: "",
      company: "",
      startDate: "",
      endDate: "Present",
      impact: "",
    };
    patch("history", [...(draft.history ?? []), next]);
  }

  function updateHistory(id: string, field: keyof HistoryEntry, val: string) {
    patch(
      "history",
      (draft.history ?? []).map((h) =>
        h.id === id ? { ...h, [field]: val } : h,
      ),
    );
  }

  function removeHistory(id: string) {
    patch(
      "history",
      (draft.history ?? []).filter((h) => h.id !== id),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/student/profile"
            className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-2"
          >
            <ChevronLeft size={14} /> Back to profile
          </Link>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink">
            Edit profile
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Auto-saves as you type. Skills + history drive match scoring across
            every job.
          </p>
        </div>
        <div className="text-right">
          <SaveIndicator state={savingState} />
        </div>
      </div>

      {/* Resume re-upload */}
      <ResumeReupload onUpdated={() => router.refresh()} />

      {/* Basics */}
      <GlassCard className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Basics
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Alias / preferred name">
            <GlassInput
              value={draft.alias ?? ""}
              onChange={(e) => patch("alias", e.target.value)}
              placeholder="aniket.s"
              maxLength={40}
            />
          </Field>
          <Field label="Contact email">
            <GlassInput
              type="email"
              value={draft.contactEmail ?? ""}
              onChange={(e) => patch("contactEmail", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <GlassInput
              value={draft.contactPhone ?? ""}
              onChange={(e) => patch("contactPhone", e.target.value)}
              placeholder="+91 9876543210"
            />
          </Field>
          <Field label="City">
            <GlassInput
              value={draft.city ?? ""}
              onChange={(e) => patch("city", e.target.value)}
              placeholder="Bengaluru"
            />
          </Field>
          <Field label="Work mode">
            <GlassSelect
              value={draft.remotePref ?? ""}
              onChange={(e) =>
                patch(
                  "remotePref",
                  (e.target.value || undefined) as
                    | "remote"
                    | "hybrid"
                    | "onsite"
                    | undefined,
                )
              }
            >
              <option value="">No preference</option>
              {REMOTE.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </GlassSelect>
          </Field>
          <Field label="Years of experience">
            <GlassInput
              type="number"
              min={0}
              max={50}
              value={draft.yearsExperience ?? ""}
              onChange={(e) =>
                patch(
                  "yearsExperience",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
          </Field>
        </div>
      </GlassCard>

      {/* Trajectory */}
      <GlassCard className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Trajectory
        </p>
        <p className="text-xs text-brand-muted">
          Drives recruiter database visibility tiering + AI Coach prompts.
        </p>
        <div className="grid sm:grid-cols-3 gap-2">
          {TRAJECTORIES.map((t) => (
            <button
              key={t.value}
              onClick={() => patch("trajectory", t.value)}
              className={`text-left rounded-2xl border p-3 transition ${
                draft.trajectory === t.value
                  ? "bg-brand-primary/10 border-brand-primary shadow-brand-glow"
                  : "bg-white/40 border-brand-ink/10 hover:border-brand-primary/40"
              }`}
            >
              <p className="font-display font-semibold text-sm text-brand-ink">
                {t.label}
              </p>
              <p className="text-xs text-brand-muted mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Skills */}
      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
          Skills
        </p>
        <p className="text-xs text-brand-muted mb-3">
          {(draft.skills ?? []).length} listed · certifications issue
          automatically from bootcamp completion
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(draft.skills ?? []).map((s) => {
            const verified = initial.verifiedSkills?.some(
              (v) => v.toLowerCase() === s.toLowerCase(),
            );
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  verified
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                    : "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                }`}
              >
                {verified && <Check size={10} />}
                {s}
                <button
                  onClick={() => removeSkill(s)}
                  className="hover:text-rose-600"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="flex gap-2">
          <GlassInput
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Type a skill and press Enter"
          />
          <GlassButton variant="brand" onClick={addSkill}>
            <Plus size={12} /> Add
          </GlassButton>
        </div>
      </GlassCard>

      {/* History */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            Work history
          </p>
          <GlassButton variant="glass" size="sm" onClick={addHistory}>
            <Plus size={12} /> Add role
          </GlassButton>
        </div>
        {(draft.history ?? []).length === 0 ? (
          <p className="text-sm text-brand-muted text-center py-6">
            No work history yet. Add your roles to boost match scoring.
          </p>
        ) : (
          <div className="space-y-3">
            {(draft.history ?? []).map((h) => (
              <div
                key={h.id}
                className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <Briefcase
                    size={14}
                    className="text-brand-primary mt-1 shrink-0"
                  />
                  <div className="flex-1 grid md:grid-cols-2 gap-2">
                    <GlassInput
                      value={h.title}
                      onChange={(e) =>
                        updateHistory(h.id, "title", e.target.value)
                      }
                      placeholder="Job title"
                    />
                    <GlassInput
                      value={h.company}
                      onChange={(e) =>
                        updateHistory(h.id, "company", e.target.value)
                      }
                      placeholder="Company"
                    />
                    <GlassInput
                      value={h.startDate}
                      onChange={(e) =>
                        updateHistory(h.id, "startDate", e.target.value)
                      }
                      placeholder="Start (e.g. 2022-04)"
                    />
                    <GlassInput
                      value={h.endDate}
                      onChange={(e) =>
                        updateHistory(h.id, "endDate", e.target.value)
                      }
                      placeholder="End (or Present)"
                    />
                    <GlassTextarea
                      value={h.impact}
                      onChange={(e) =>
                        updateHistory(h.id, "impact", e.target.value)
                      }
                      rows={3}
                      className="md:col-span-2"
                      placeholder="What you shipped + the measurable outcome."
                    />
                  </div>
                  <button
                    onClick={() => removeHistory(h.id)}
                    className="text-brand-muted hover:text-rose-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Certifications (read-only) */}
      {initial.verifiedSkills && initial.verifiedSkills.length > 0 && (
        <GlassCard className="bg-emerald-500/5 border-emerald-500/20">
          <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-2">
            Certified by bootcamp completion · cannot be edited
          </p>
          <div className="flex flex-wrap gap-1.5">
            {initial.verifiedSkills.map((s) => (
              <GlassBadge key={s} tone="success">
                <Check size={10} /> {s}
              </GlassBadge>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted font-semibold">
        <Loader2 size={12} className="animate-spin" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
        <Save size={12} /> Saved
      </span>
    );
  return (
    <span className="text-[10px] text-brand-muted">
      Auto-saves as you type
    </span>
  );
}

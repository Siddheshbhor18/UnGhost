"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Plus, Shield, Sparkles, X } from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  Logo,
} from "@/components/glass";
import type { ParsedResume } from "@/shared/types/ai";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [alias, setAlias] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [trajectory, setTrajectory] =
    useState<"actively_hunting" | "casually_exploring" | "open_to_magic">("actively_hunting");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?next=/onboarding");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      // Path A: landing-page Magic Widget pre-staged a full parse — skip the API
      try {
        const staged = sessionStorage.getItem("unghost:staged_resume");
        if (staged) {
          const bundle = JSON.parse(staged) as {
            fileName?: string;
            parsed?: ParsedResume;
          };
          if (bundle.parsed) {
            setParsed(bundle.parsed);
            setAlias(bundle.parsed.alias);
            setContactEmail(
              session?.user?.email ?? bundle.parsed.contactEmail,
            );
            setSkills(bundle.parsed.skills);
            setLoading(false);
            sessionStorage.removeItem("unghost:staged_resume");
            return;
          }
        }
      } catch {
        /* ignore corrupt staging */
      }

      // Path B: fall through to legacy rawText parse
      const pending =
        sessionStorage.getItem("ng_pending_resume") ??
        `Name: ${session?.user?.name}\nEmail: ${session?.user?.email}`;
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: pending }),
      });
      const data: { parsed: ParsedResume } = await res.json();
      const p = data.parsed ?? (data as unknown as ParsedResume);
      setParsed(p);
      setAlias(p.alias);
      setContactEmail(session?.user?.email ?? p.contactEmail);
      setSkills(p.skills);
      setLoading(false);
      sessionStorage.removeItem("ng_pending_resume");
    })();
  }, [status, session, router]);

  function addSkill() {
    const s = skillInput.trim();
    if (!s) return;
    if (!skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  }

  async function confirm() {
    // Persist the onboarding form back to the student's profile.
    try {
      await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alias,
          contactEmail,
          trajectory,
          skills,
          history: parsed?.history?.map((h, i) => ({
            id: `h_${Date.now().toString(36)}_${i}`,
            ...h,
          })),
          city: parsed?.city,
        }),
      });
    } catch {
      /* even if persist fails, route forward — student can edit on profile */
    }
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-screen px-4 py-10">
      <BlobField />

      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Logo size="sm" />
          <GlassBadge tone="brand">
            <Shield size={11} /> AI-parsed · editable
          </GlassBadge>
        </div>

        <GlassCard variant="strong" className="p-7">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-brand-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary">
              Step 2 of 2
            </p>
          </div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-ink">
            {loading ? "Parsing your resume…" : "Confirm your profile."}
          </h1>
          <p className="text-sm text-brand-muted mt-1 mb-6">
            {loading
              ? "Our AI is reading your resume. This takes about 10 seconds."
              : "Auto-extracted from your resume. Edit anything that looks off."}
          </p>

          {loading ? (
            <div className="space-y-3 py-6">
              <Skeleton />
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <div className="space-y-5">
              <Field label="Professional alias">
                <GlassInput value={alias} onChange={(e) => setAlias(e.target.value)} />
              </Field>

              <Field label="Contact email">
                <GlassInput
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </Field>

              <Field label="Current trajectory">
                <GlassSelect
                  value={trajectory}
                  onChange={(e) => setTrajectory(e.target.value as typeof trajectory)}
                >
                  <option value="actively_hunting">⚡ Actively hunting</option>
                  <option value="casually_exploring">👀 Casually exploring</option>
                  <option value="open_to_magic">✨ Open to magic</option>
                </GlassSelect>
              </Field>

              <Field label="Core skills">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 bg-brand-primary/10 text-brand-primary text-xs font-semibold px-2.5 py-1 rounded-full"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((k) => k !== s))}
                        className="hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <GlassInput
                    placeholder="Add a skill (e.g. SQL)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <GlassButton type="button" variant="glass" onClick={addSkill}>
                    <Plus size={12} /> Add
                  </GlassButton>
                </div>
              </Field>

              {parsed?.history && parsed.history.length > 0 && (
                <Field label="History detected">
                  <div className="space-y-2">
                    {parsed.history.map((h, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-white/40 border border-white/60 p-3"
                      >
                        <p className="font-display font-bold text-sm text-brand-ink">
                          {h.title} · {h.company}
                        </p>
                        <p className="text-[11px] text-brand-muted">
                          {h.startDate} → {h.endDate}
                        </p>
                        <p className="text-sm text-brand-ink/80 mt-1.5 leading-relaxed">
                          {h.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </Field>
              )}

              <div className="pt-3 border-t border-brand-ink/10">
                <GlassButton variant="brand" fullWidth size="lg" onClick={confirm}>
                  Enter dashboard <ArrowRight size={14} />
                </GlassButton>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Skeleton() {
  return <div className="h-11 rounded-xl bg-brand-ink/5 animate-pulse" />;
}

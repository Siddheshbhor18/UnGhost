"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { LaserScan } from "@/components/arcade/LaserScan";
import { X, Plus, ArrowRight, Shield } from "lucide-react";
import type { ParsedResume } from "@/lib/ai";

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [alias, setAlias] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [trajectory, setTrajectory] = useState<"actively_hunting" | "casually_exploring" | "open_to_magic">("actively_hunting");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?next=/onboarding");
      return;
    }
    if (status !== "authenticated") return;

    const pending = sessionStorage.getItem("ng_pending_resume") ?? `Name: ${session?.user?.name}\nEmail: ${session?.user?.email}`;
    (async () => {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: pending }),
      });
      const data: ParsedResume = await res.json();
      setParsed(data);
      setAlias(data.alias);
      setContactEmail(session?.user?.email ?? data.contactEmail);
      setSkills(data.skills);
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

  function confirm() {
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Badge tone="pink">▸ FLOW 02 · PROFILE PARSER</Badge>
          <Badge tone="green"><Shield size={10} /> AI-PARSED</Badge>
        </div>

        <ArcadeCard glow="pink" className="relative overflow-hidden">
          <h1 className="font-pixel text-xl text-neon-pink neon-text mb-2">
            {loading ? "PARSING RESUME…" : "Confirm Your Identity"}
          </h1>
          <p className="font-mono text-xs text-ink-muted mb-6">
            {loading
              ? "Our AI is scanning your resume. This takes ~10 seconds."
              : "Auto-extracted from your resume. Edit anything that looks off."}
          </p>

          {loading ? (
            <div className="relative space-y-3 py-10">
              <LaserScan active color="blue" />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <p className="text-center font-mono text-xs text-neon-blue mt-4">
                <span className="cursor-blink">SCANNING</span>
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              <Field label="PROFESSIONAL ALIAS">
                <input className="pixel-input w-full" value={alias} onChange={(e) => setAlias(e.target.value)} />
              </Field>
              <Field label="CONTACT EMAIL">
                <input className="pixel-input w-full" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </Field>
              <Field label="CURRENT TRAJECTORY">
                <select className="pixel-input w-full" value={trajectory} onChange={(e) => setTrajectory(e.target.value as typeof trajectory)}>
                  <option value="actively_hunting">⚡ Actively Hunting</option>
                  <option value="casually_exploring">👀 Casually Exploring</option>
                  <option value="open_to_magic">✨ Open to Magic</option>
                </select>
              </Field>
              <Field label="CORE COMPETENCIES">
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 border border-neon-blue text-neon-blue px-2 py-1 font-mono text-xs">
                      {s}
                      <button onClick={() => setSkills(skills.filter((k) => k !== s))} className="hover:text-neon-red">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="pixel-input flex-1"
                    placeholder="Add a skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <PixelButton variant="blue" size="md" type="button" onClick={addSkill}>
                    <Plus size={12} /> Add
                  </PixelButton>
                </div>
              </Field>

              <Field label="HISTORY TERMINAL">
                <div className="space-y-3">
                  {(parsed?.history ?? []).map((h, i) => (
                    <div key={i} className="border-2 border-bg-ink bg-bg-base p-3">
                      <p className="font-pixel text-xs text-neon-green">{h.title} · {h.company}</p>
                      <p className="font-mono text-[10px] text-ink-muted">{h.startDate} → {h.endDate}</p>
                      <p className="font-mono text-xs text-ink-primary mt-2 leading-relaxed">{h.impact}</p>
                    </div>
                  ))}
                </div>
              </Field>

              <div className="border-t-2 border-bg-ink pt-4">
                <PixelButton variant="green" size="lg" block onClick={confirm}>
                  Confirm & Enter Terminal <ArrowRight size={14} />
                </PixelButton>
              </div>
            </motion.div>
          )}
        </ArcadeCard>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-pixel text-[10px] text-ink-muted block mb-2">{label}</label>
      {children}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-10 bg-bg-ink/40 animate-pulse" />
  );
}

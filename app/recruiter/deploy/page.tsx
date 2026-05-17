"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassNavbar,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import { Sparkles, Plus, X, Rocket } from "lucide-react";

export default function DeployMission() {
  const router = useRouter();
  const { data: session } = useSession();
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [launching, setLaunching] = useState(false);

  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [location, setLocation] = useState("Bengaluru");
  const [remote, setRemote] = useState<"remote" | "hybrid" | "onsite">("hybrid");
  const [sla, setSla] = useState<24 | 48 | 72>(48);
  const [gauntletPrompt, setGauntletPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [salaryMin, setSalaryMin] = useState(30);
  const [salaryMax, setSalaryMax] = useState(50);

  async function parse() {
    if (!jdText.trim()) return;
    setParsing(true);
    const res = await fetch("/api/parse-jd", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jdText }),
    });
    const data = await res.json();
    setTitle(data.title);
    setSkills(data.skills);
    setGauntletPrompt(data.gauntletPrompt);
    setDescription(data.description);
    setSalaryMin(data.salaryMin);
    setSalaryMax(data.salaryMax);
    setParsing(false);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  }

  async function deploy() {
    setLaunching(true);
    const email = session?.user?.email ?? "";
    const map: Record<string, string> = {
      "stark.test": "co_stark",
      "quanta.test": "co_quanta",
      "lumen.test": "co_lumen",
    };
    const companyId = map[email.split("@")[1] ?? ""] ?? "co_stark";
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId,
        title,
        skills,
        location,
        remote,
        slaHours: sla,
        gauntletPrompt,
        description,
        salaryMin,
        salaryMax,
      }),
    });
    await new Promise((r) => setTimeout(r, 900));
    router.push("/recruiter/command");
  }

  return (
    <main className="min-h-screen relative">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <GlassBadge tone="brand">
          <Rocket size={12} /> Deploy Mission · Zero-setup
        </GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3 mb-1">
          Mission Deployment
        </h1>
        <p className="text-sm text-brand-muted mb-8">
          Paste a JD, hit Parse with AI, edit anything, then deploy. We handle the rest —
          gauntlet generation, candidate scoring, anti-ghost SLA.
        </p>

        {/* Brief paste */}
        <GlassCard className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              The Brief — Paste Unstructured JD
            </p>
            {parsing && (
              <span className="text-xs text-brand-primary animate-pulse">parsing…</span>
            )}
          </div>
          <GlassTextarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="min-h-[140px]"
            placeholder="Paste the raw JD here — title, must-have skills, what success looks like. We'll extract the rest."
          />
          <div className="mt-3 flex justify-end">
            <GlassButton
              variant="brand"
              size="md"
              onClick={parse}
              disabled={parsing || !jdText.trim()}
            >
              <Sparkles size={14} /> {parsing ? "Parsing…" : "Parse with AI"}
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard className="mb-5 space-y-5">
          <Row label="Mission Title">
            <GlassInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Python Engineer"
            />
          </Row>

          <Row label="Non-Negotiable Superpowers">
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-xs font-semibold"
                >
                  {s}
                  <button
                    onClick={() => setSkills(skills.filter((k) => k !== s))}
                    className="hover:text-rose-600 transition"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <GlassInput
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <GlassButton variant="brand" size="md" onClick={addSkill}>
                <Plus size={14} />
              </GlassButton>
            </div>
          </Row>

          <div className="grid md:grid-cols-3 gap-4">
            <Row label="Base Location">
              <GlassInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Row>
            <Row label="Remote Stance">
              <GlassSelect
                value={remote}
                onChange={(e) => setRemote(e.target.value as typeof remote)}
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </GlassSelect>
            </Row>
            <Row label="SLA Commitment">
              <div className="flex gap-1.5">
                {[24, 48, 72].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSla(h as 24 | 48 | 72)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                      sla === h
                        ? "bg-brand-primary text-white border-brand-primary shadow-brand-glow"
                        : "bg-white/40 border-brand-ink/10 text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                    }`}
                  >
                    {h}H
                  </button>
                ))}
              </div>
            </Row>
          </div>

          <Row label="The Gauntlet — AI-Generated · Edit Freely">
            <GlassTextarea
              value={gauntletPrompt}
              onChange={(e) => setGauntletPrompt(e.target.value)}
              className="min-h-[120px]"
              placeholder="The situational prompt every applicant must answer."
            />
          </Row>

          <Row label="Mission Description">
            <GlassTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </Row>

          <div className="grid md:grid-cols-2 gap-4">
            <Row label="Reward Range — Min (₹ LPA)">
              <GlassInput
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(+e.target.value)}
              />
            </Row>
            <Row label="Reward Range — Max (₹ LPA)">
              <GlassInput
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(+e.target.value)}
              />
            </Row>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <GlassButton
            variant="brand"
            size="lg"
            onClick={deploy}
            disabled={launching || !title || skills.length === 0}
          >
            <Rocket size={16} /> {launching ? "Deploying…" : "Deploy Mission"}
          </GlassButton>
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

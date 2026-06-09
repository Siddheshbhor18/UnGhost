"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import { Sparkles, Plus, X, Rocket } from "lucide-react";
import { normalizeSkill } from "@/shared/skills";

export default function DeployMissionForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [experienceMin, setExperienceMin] = useState(2);
  const [experienceMax, setExperienceMax] = useState(5);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Hydrate from a "Use template" click on /recruiter/templates (one-shot).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("unghost:job_template");
      if (!raw) return;
      sessionStorage.removeItem("unghost:job_template");
      const t = JSON.parse(raw);
      if (t.title) setTitle(t.title);
      if (Array.isArray(t.skills)) setSkills(t.skills);
      if (t.gauntletPrompt) setGauntletPrompt(t.gauntletPrompt);
      if (t.description) setDescription(t.description);
      if (typeof t.salaryMin === "number") setSalaryMin(t.salaryMin);
      if (typeof t.salaryMax === "number") setSalaryMax(t.salaryMax);
      if (t.remote) setRemote(t.remote);
      if (t.slaHours) setSla(t.slaHours);
      if (t.location) setLocation(t.location);
    } catch {
      /* ignore a malformed template payload */
    }
  }, []);

  async function saveAsTemplate() {
    const name = window.prompt(
      "Save these fields as a reusable template. Name it:",
      title || "Untitled template",
    );
    if (!name?.trim()) return;
    const res = await fetch("/api/recruiter/templates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        title,
        skills,
        gauntletPrompt,
        description,
        salaryMin,
        salaryMax,
        remote,
        slaHours: sla,
        location,
      }),
    });
    setSavedMsg(
      res.ok ? "Saved to your templates ✓" : "Couldn't save the template.",
    );
    setTimeout(() => setSavedMsg(null), 2500);
  }

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
    // Dedup by normalized form so "React" and "react" / "React.js" aren't
    // both added to the same job.
    if (s && !skills.some((x) => normalizeSkill(x) === normalizeSkill(s))) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  }

  async function deploy() {
    setLaunching(true);
    setError(null);
    const res = await fetch("/api/jobs", {
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
        experienceMin,
        experienceMax,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const map: Record<string, string> = {
        not_your_company:
          "This company isn't linked to your account. Contact ops@unghost.in.",
        company_suspended:
          "This company is suspended and can't post jobs right now.",
        company_not_found: "Company not found.",
        no_account: "Your account couldn't be verified. Sign in again.",
      };
      setError(map[body?.error] ?? "Couldn't post the job. Please try again.");
      setLaunching(false);
      return;
    }
    const body = await res.json().catch(() => ({}));
    await new Promise((r) => setTimeout(r, 900));
    // Held for approval (unverified company / non-matching work email) → tell
    // the recruiter it's pending instead of pretending it's live.
    router.push(
      body?.pendingApproval
        ? "/recruiter/command?pending=1"
        : "/recruiter/command",
    );
  }

  return (
    <>
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

        <div className="grid md:grid-cols-2 gap-4">
          <Row label="Experience — Min (years)">
            <GlassInput
              type="number"
              min={0}
              value={experienceMin}
              onChange={(e) => setExperienceMin(+e.target.value)}
            />
          </Row>
          <Row label="Experience — Max (years)">
            <GlassInput
              type="number"
              min={0}
              value={experienceMax}
              onChange={(e) => setExperienceMax(+e.target.value)}
            />
          </Row>
        </div>
      </GlassCard>

      {error && (
        <p className="mb-3 text-sm text-red-500 text-right">{error}</p>
      )}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        {savedMsg && (
          <span className="text-xs font-semibold text-emerald-600">
            {savedMsg}
          </span>
        )}
        <GlassButton
          variant="glass"
          size="lg"
          onClick={saveAsTemplate}
          disabled={!title}
        >
          Save as template
        </GlassButton>
        <GlassButton
          variant="brand"
          size="lg"
          onClick={deploy}
          disabled={launching || !title || skills.length === 0}
        >
          <Rocket size={16} /> {launching ? "Deploying…" : "Deploy Mission"}
        </GlassButton>
      </div>
    </>
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

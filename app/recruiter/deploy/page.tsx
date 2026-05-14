"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/shared/Navbar";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { LaserScan } from "@/components/arcade/LaserScan";
import { RocketLaunch } from "@/components/arcade/RocketLaunch";
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
    // Look up the recruiter's companyId from session (in real flow). For demo, infer from email domain.
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
    await new Promise((r) => setTimeout(r, 1100));
    router.push("/recruiter/command");
  }

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <RocketLaunch active={launching} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Badge tone="blue">▸ DEPLOY MISSION · ZERO-SETUP</Badge>
        <h1 className="font-pixel text-2xl text-neon-blue neon-text mt-2 mb-1">Mission Deployment</h1>
        <p className="font-mono text-xs text-ink-muted mb-6">
          Paste a JD, hit Parse with AI, edit, deploy. We handle the rest.
        </p>

        {/* Brief paste */}
        <ArcadeCard glow="blue" className="mb-4 relative overflow-hidden">
          <p className="font-pixel text-[10px] text-neon-blue mb-2">▸ THE BRIEF · PASTE UNSTRUCTURED JD</p>
          {parsing && (
            <div className="absolute inset-x-0 top-12 h-12 overflow-hidden">
              <LaserScan active color="green" />
            </div>
          )}
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            className="pixel-input w-full min-h-[140px] text-sm"
            placeholder="Paste the raw JD here — title, must-have skills, what success looks like. We'll extract the rest."
          />
          <div className="mt-3 flex justify-end">
            <PixelButton variant="green" size="md" onClick={parse} disabled={parsing || !jdText.trim()}>
              <Sparkles size={14} /> {parsing ? "PARSING…" : "Parse with AI"}
            </PixelButton>
          </div>
        </ArcadeCard>

        <ArcadeCard className="mb-4 space-y-4">
          <Row label="MISSION TITLE">
            <input className="pixel-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Python Engineer" />
          </Row>
          <Row label="NON-NEGOTIABLE SUPERPOWERS">
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 border border-neon-pink text-neon-pink px-2 py-1 font-mono text-xs">
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
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              />
              <PixelButton variant="pink" size="md" onClick={addSkill}><Plus size={12}/></PixelButton>
            </div>
          </Row>
          <div className="grid md:grid-cols-3 gap-4">
            <Row label="BASE LOCATION">
              <input className="pixel-input w-full" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Row>
            <Row label="REMOTE STANCE">
              <select className="pixel-input w-full" value={remote} onChange={(e) => setRemote(e.target.value as typeof remote)}>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>
            </Row>
            <Row label="SLA COMMITMENT">
              <div className="flex gap-1">
                {[24, 48, 72].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSla(h as 24 | 48 | 72)}
                    className={`flex-1 border-2 py-2 font-pixel text-[10px] transition-colors ${
                      sla === h
                        ? "border-neon-green bg-neon-green text-black"
                        : "border-bg-ink text-ink-muted hover:border-neon-green hover:text-neon-green"
                    }`}
                  >
                    {h}H
                  </button>
                ))}
              </div>
            </Row>
          </div>
          <Row label="THE GAUNTLET · AI-GENERATED · EDIT FREELY">
            <textarea
              className="pixel-input w-full min-h-[120px]"
              value={gauntletPrompt}
              onChange={(e) => setGauntletPrompt(e.target.value)}
              placeholder="The situational prompt every applicant must answer."
            />
          </Row>
          <Row label="MISSION DESCRIPTION">
            <textarea
              className="pixel-input w-full min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Row>
          <div className="grid md:grid-cols-2 gap-4">
            <Row label="REWARD RANGE · MIN (₹ LPA)">
              <input type="number" className="pixel-input w-full" value={salaryMin} onChange={(e) => setSalaryMin(+e.target.value)} />
            </Row>
            <Row label="REWARD RANGE · MAX (₹ LPA)">
              <input type="number" className="pixel-input w-full" value={salaryMax} onChange={(e) => setSalaryMax(+e.target.value)} />
            </Row>
          </div>
        </ArcadeCard>

        <div className="flex justify-end">
          <PixelButton variant="pink" size="lg" onClick={deploy} disabled={launching || !title || skills.length === 0}>
            <Rocket size={14} /> {launching ? "DEPLOYING…" : "Deploy Mission"}
          </PixelButton>
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-pixel text-[10px] text-ink-muted block mb-2">{label}</label>
      {children}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { RocketLaunch } from "@/components/arcade/RocketLaunch";
import { depthScore } from "@/lib/utils/matching";
import type { Job } from "@/lib/data/types";
import { Target, Clock } from "lucide-react";

export default function AssessmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [response, setResponse] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`)
      .then((r) => r.json())
      .then(setJob);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [params.id]);

  const depth = depthScore(response);
  const deep = depth >= 50;

  async function submit() {
    if (!deep) return;
    setLaunching(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: params.id, response }),
    });
    await new Promise((r) => setTimeout(r, 1100));
    router.push("/dashboard");
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <RocketLaunch active={launching} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <Badge tone="yellow"><Target size={10} /> THE GAUNTLET</Badge>
          <Badge tone="muted"><Clock size={10} /> {mm}:{ss} · soft timer</Badge>
        </div>

        <ArcadeCard glow="yellow" className="mb-4">
          <p className="font-pixel text-[10px] text-neon-yellow mb-2">▸ SITUATIONAL PROMPT</p>
          <p className="font-mono text-base text-ink-primary leading-relaxed whitespace-pre-line">
            {job?.gauntletPrompt ?? "Loading…"}
          </p>
        </ArcadeCard>

        <ArcadeCard className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-pixel text-[10px] text-neon-blue">▸ YOUR RESPONSE</p>
            <p className="font-mono text-[10px] text-ink-dim">
              {response.length} chars · {response.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="pixel-input w-full min-h-[300px] resize-y leading-relaxed text-sm"
            placeholder="Write your real answer. Name the trade-offs explicitly. Include the metric you'd watch. Tell the truth about what you'd cut."
            autoFocus
          />
          <div className="mt-3">
            <p className="font-pixel text-[10px] mb-1 text-ink-muted">▸ DEPTH INDICATOR</p>
            <div className="relative h-3 border-2 border-bg-ink bg-bg-base overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{
                  width: `${Math.min(100, depth)}%`,
                  background: deep ? "var(--neon-green)" : depth >= 30 ? "var(--neon-yellow)" : "var(--neon-red)",
                  boxShadow: deep ? "0 0 12px var(--neon-green)" : "none",
                }}
              />
            </div>
            <p className={`font-mono text-[10px] mt-1 ${deep ? "text-neon-green" : "text-ink-muted"}`}>
              {deep ? "DEPTH OK · submit when ready" : "Keep going. Name the trade-offs. Cite the metric."}
            </p>
          </div>
        </ArcadeCard>

        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-ink-dim">
            Auto-saved locally · graded the moment you submit
          </p>
          <PixelButton variant="pink" size="lg" disabled={!deep || launching} onClick={submit}>
            {launching ? "LAUNCHING…" : "Submit Application 🚀"}
          </PixelButton>
        </div>
      </div>
    </main>
  );
}

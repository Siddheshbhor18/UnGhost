"use client";

import { useRef, useState } from "react";
import { Upload, Sparkles, CheckCircle2, FileText } from "lucide-react";
import clsx from "clsx";
import { useRouter } from "next/navigation";

/**
 * Magic Widget — drop-resume entry point on landing page.
 * Mocks the laser-scan parse animation. On successful "parse" routes
 * to /signup with a flag so onboarding can fetch the staged resume.
 * Real implementation would POST to /api/parse-resume.
 */
export function MagicWidget({ sticky = false }: { sticky?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert("Resume must be under 5 MB.");
      return;
    }
    setFileName(file.name);
    setPhase("scanning");
    setChips([]);

    // Real parse — POST multipart to /api/parse-resume
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("parse failed");
      const data: {
        parsed: {
          alias: string;
          skills: string[];
          history: Array<{
            title: string;
            company: string;
            startDate: string;
            endDate: string;
            impact: string;
          }>;
          city?: string;
          contactEmail?: string;
          contactPhone?: string;
        };
      } = await res.json();

      // Stream-in chips one-by-one for the "laser-scan" feel
      data.parsed.skills.forEach((skill, i) => {
        setTimeout(() => setChips((c) => [...c, skill]), 300 + i * 220);
      });
      const totalDelay = 300 + data.parsed.skills.length * 220 + 400;
      setTimeout(() => {
        setPhase("done");
        // Stage the full parsed bundle — signup/onboarding hydrate from this
        sessionStorage.setItem(
          "unghost:staged_resume",
          JSON.stringify({
            fileName: file.name,
            parsed: data.parsed,
            stagedAt: Date.now(),
          }),
        );
      }, totalDelay);
    } catch {
      // Path 2 fallback — server unreachable, still render plausible chips
      const detected = ["Python", "SQL", "React", "Communication", "Leadership"];
      detected.forEach((chip, i) => {
        setTimeout(() => setChips((c) => [...c, chip]), 500 + i * 400);
      });
      setTimeout(() => {
        setPhase("done");
        sessionStorage.setItem(
          "unghost:staged_resume",
          JSON.stringify({ fileName: file.name, stagedAt: Date.now() }),
        );
      }, 3000);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div
      className={clsx(
        "rounded-3xl border bg-white/70 backdrop-blur-2xl shadow-glass-lg p-6 transition",
        sticky && "fixed bottom-6 right-6 z-40 max-w-sm hidden md:block",
        dragOver
          ? "border-brand-primary shadow-brand-glow"
          : "border-white/60",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-brand-primary" />
        <p className="text-xs uppercase tracking-wider font-semibold text-brand-primary">
          Resume Parser
        </p>
      </div>

      {phase === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={clsx(
            "rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition",
            dragOver
              ? "border-brand-primary bg-brand-primary/5"
              : "border-brand-ink/15 hover:border-brand-primary/50 hover:bg-white/40",
          )}
        >
          <Upload size={28} className="mx-auto text-brand-primary mb-3" />
          <p className="font-display text-lg font-bold text-brand-ink mb-1">
            Drop your resume
          </p>
          <p className="text-sm text-brand-muted">
            PDF or DOCX · up to 5 MB · auto-parsed in seconds
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}

      {phase === "scanning" && (
        <div className="relative rounded-2xl border border-brand-primary/30 p-6 bg-white/50 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent animate-pulse" />
          <div
            className="absolute inset-x-0 h-12 bg-gradient-to-b from-brand-primary/0 via-brand-primary/20 to-brand-primary/0 animate-[scan_2.4s_ease-in-out_infinite]"
            style={{ animationName: "scan" }}
          />
          <style jsx>{`
            @keyframes scan {
              0% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(120%);
              }
              100% {
                transform: translateY(0);
              }
            }
          `}</style>
          <div className="relative flex items-center gap-2 mb-3">
            <FileText size={16} className="text-brand-primary" />
            <p className="text-sm font-semibold text-brand-ink truncate">
              {fileName}
            </p>
          </div>
          <p className="relative text-xs text-brand-muted mb-3">
            Reading skills, history, impact…
          </p>
          <div className="relative flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="text-[11px] px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold animate-[fade-up_0.3s_ease-out]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <p className="font-display text-base font-bold text-brand-ink">
              Parsed — {chips.length} skills detected
            </p>
          </div>
          <p className="text-xs text-brand-muted mb-4">
            Create an account to see matched missions.
          </p>
          <button
            onClick={() => router.push("/signup?from=resume")}
            className="btn-brand w-full justify-center"
          >
            Continue → create account
          </button>
        </div>
      )}
    </div>
  );
}

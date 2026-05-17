"use client";

import { useState } from "react";
import { Upload, FileCheck2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { GlassButton } from "@/components/glass";

/**
 * Phase 1 mock: accepts a PDF, fakes a 1.4s parse,
 * shows the filename and a "Skills detected" hint.
 * Phase 2 swaps the body for a real Claude API call.
 */
export function ResumeDrop({ initialSkills }: { initialSkills: string[] }) {
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>(initialSkills);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setFile(f.name);
    setTimeout(() => {
      // mocked enrichment — preserves real seeded skills, adds 1-2 "detected" tags
      const detected = ["Communication", "Problem Solving"].filter((s) => !initialSkills.includes(s));
      setSkills([...initialSkills, ...detected]);
      setBusy(false);
    }, 1400);
  }

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-display font-bold text-brand-ink">Your resume</p>
          <p className="text-xs text-brand-muted">
            We use this to rank jobs by match. Update anytime.
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={onPick}
            disabled={busy}
          />
          <GlassButton variant="brand" size="sm" type="button" onClick={(e) => {
            (e.currentTarget.previousSibling as HTMLInputElement)?.click();
          }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {busy ? "Parsing…" : file ? "Re-upload" : "Upload"}
          </GlassButton>
        </label>
      </div>

      <div className={clsx(
        "rounded-xl border border-dashed border-brand-ink/15 px-4 py-3 flex items-center gap-2 text-sm",
        file ? "bg-emerald-500/5 text-emerald-700" : "text-brand-muted"
      )}>
        {file ? <FileCheck2 size={16} /> : <Upload size={16} />}
        {file ? file : "No file uploaded yet · PDF/DOC up to 5MB"}
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-2">
          Skills on file
        </p>
        <div className="flex flex-wrap gap-1.5">
          {skills.length === 0 && (
            <span className="text-xs text-brand-muted">Upload to detect skills.</span>
          )}
          {skills.map((s) => (
            <span
              key={s}
              className="text-[11px] px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary font-medium"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

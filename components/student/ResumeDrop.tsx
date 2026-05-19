"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileCheck2, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { GlassButton } from "@/components/glass";

/**
 * Real resume upload — POSTs the file to /api/parse-resume which:
 *   1. Extracts text via pdf-parse / mammoth
 *   2. Calls the AI adapter (Claude live, deterministic mock if no key)
 *   3. With `persist=1`, writes the parsed profile back to the user
 *
 * The detected skills shown afterwards come from the actual resume text —
 * not the old hardcoded ["Communication", "Problem Solving"] stub.
 */
export function ResumeDrop({ initialSkills }: { initialSkills: string[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }
    setBusy(true);
    setError(null);
    setFile(f.name);

    try {
      const form = new FormData();
      form.append("file", f);
      // persist=1 so the server writes the parsed alias/skills/history back
      // onto the authenticated student's profile.
      form.append("persist", "1");

      const res = await fetch("/api/parse-resume", { method: "POST", body: form });
      const data = (await res.json()) as {
        parsed?: { skills?: string[] };
        error?: string;
      };

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many uploads. Try again in a minute.");
        } else {
          setError(data.error ?? "Couldn't parse this file. Try a different format.");
        }
        return;
      }

      const detected = data.parsed?.skills ?? [];
      // Merge: keep what was already there, add anything new the parser found.
      const merged = Array.from(new Set([...initialSkills, ...detected]));
      setSkills(merged);
      // Refresh the surrounding RSC so other widgets (match scores, profile
      // completeness ring) pick up the new skills.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
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
            ref={fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={onPick}
            disabled={busy}
          />
          <GlassButton
            variant="brand"
            size="sm"
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {busy ? "Parsing…" : file ? "Re-upload" : "Upload"}
          </GlassButton>
        </label>
      </div>

      <div
        className={clsx(
          "rounded-xl border border-dashed border-brand-ink/15 px-4 py-3 flex items-center gap-2 text-sm",
          file ? "bg-emerald-500/5 text-emerald-700" : "text-brand-muted",
        )}
      >
        {file ? <FileCheck2 size={16} /> : <Upload size={16} />}
        {file ? file : "No file uploaded yet · PDF/DOC/TXT up to 5MB"}
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

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

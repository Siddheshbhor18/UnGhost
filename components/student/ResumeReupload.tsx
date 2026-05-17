"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RotateCw,
  Upload,
  XCircle,
} from "lucide-react";
import { GlassButton, GlassCard } from "@/components/glass";

interface Props {
  /** Called with the new parsed bundle so the editor refreshes. */
  onUpdated?: () => void;
}

type Phase = "idle" | "scanning" | "done" | "error";

export function ResumeReupload({ onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5 MB");
      setPhase("error");
      return;
    }
    setFileName(file.name);
    setPhase("scanning");
    setChips([]);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("persist", "1");
    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't parse — try a different file");
        setPhase("error");
        return;
      }
      const data: { parsed: { skills: string[] } } = await res.json();
      // Stream chips
      data.parsed.skills.forEach((s, i) => {
        setTimeout(() => setChips((c) => [...c, s]), 200 + i * 180);
      });
      setTimeout(() => {
        setPhase("done");
        onUpdated?.();
      }, 300 + data.parsed.skills.length * 180 + 300);
    } catch {
      setError("Upload failed — try again");
      setPhase("error");
    }
  }

  return (
    <GlassCard className="!p-4">
      <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
        <FileText size={11} /> Resume
      </p>

      {phase === "idle" && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-brand-ink/85 leading-relaxed">
            Drop a fresh PDF or DOCX to re-extract your skills + history. Your
            current data is overwritten only after the AI confirms a clean
            parse.
          </p>
          <GlassButton
            variant="brand"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={12} /> Re-upload
          </GlassButton>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </div>
      )}

      {phase === "scanning" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-brand-ink">
            <Loader2 size={14} className="text-brand-primary animate-spin" />
            <span className="font-semibold truncate">{fileName}</span>
            <span className="text-xs text-brand-muted">extracting…</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="text-[11px] px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold animate-[fade-up_0.3s_ease-out]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={14} />
            <span className="font-semibold">{fileName}</span>
            <span className="text-xs text-brand-muted">
              · {chips.length} skills detected · profile updated
            </span>
          </div>
          <button
            onClick={() => setPhase("idle")}
            className="text-xs text-brand-primary font-semibold hover:underline inline-flex items-center gap-1"
          >
            <RotateCw size={11} /> Upload another
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-rose-700">
            <XCircle size={14} />
            <span>{error}</span>
          </div>
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setPhase("idle")}
          >
            Try again
          </GlassButton>
        </div>
      )}
    </GlassCard>
  );
}

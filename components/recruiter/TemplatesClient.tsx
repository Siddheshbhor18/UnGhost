"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { JobTemplate } from "@/shared/types";

interface Props {
  initial: JobTemplate[];
  recruiterId: string;
}

export function TemplatesClient({ initial, recruiterId }: Props) {
  const router = useRouter();
  const [list, setList] = useState<JobTemplate[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Delete template?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/recruiter/templates/${id}`, { method: "DELETE" });
      setList((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  function applyTemplate(t: JobTemplate) {
    // Phase 1: deploy page reads from sessionStorage on mount (Phase 2 wires properly)
    sessionStorage.setItem("unghost:job_template", JSON.stringify(t));
    router.push("/recruiter/deploy");
  }

  if (list.length === 0) {
    return (
      <GlassCard className="text-center !py-12">
        <FileText size={28} className="mx-auto text-brand-muted mb-3" />
        <p className="font-display font-bold text-brand-ink">No templates yet</p>
        <p className="text-sm text-brand-muted mt-2">
          On any Deploy Mission flow, tap <em>Save as template</em> to reuse
          fields later.
        </p>
        <Link href="/recruiter/deploy" className="btn-brand inline-flex mt-5">
          Deploy a mission first →
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((t) => {
        const isMine = t.recruiterId === recruiterId;
        return (
          <GlassCard key={t.id} className="!p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GlassBadge tone="brand">{t.remote}</GlassBadge>
                  <GlassBadge tone="warn">{t.slaHours}h SLA</GlassBadge>
                  {!isMine && t.isCompanyShared && (
                    <GlassBadge tone="success">Company shared</GlassBadge>
                  )}
                </div>
                <p className="font-display font-bold text-base text-brand-ink">
                  {t.name}
                </p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {t.title} · {t.location} · ₹{t.salaryMin}–{t.salaryMax}L ·{" "}
                  {t.skills.length} skills
                </p>
              </div>
            </div>
            {t.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {t.skills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/5 text-brand-muted font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-brand-ink/5">
              {isMine && (
                <GlassButton
                  variant="glass"
                  size="sm"
                  onClick={() => remove(t.id)}
                  disabled={busyId === t.id}
                >
                  {busyId === t.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                </GlassButton>
              )}
              <GlassButton
                variant="brand"
                size="sm"
                onClick={() => applyTemplate(t)}
              >
                <Copy size={11} /> Use template <ChevronRight size={11} />
              </GlassButton>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

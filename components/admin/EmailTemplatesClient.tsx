"use client";

import { useState } from "react";
import clsx from "clsx";
import type { EmailTemplate } from "@/shared/types";
import { GlassCard, GlassInput } from "@/components/glass";
import { Loader2, Mail, RotateCcw, Save } from "lucide-react";

export function EmailTemplatesClient({ initial }: { initial: EmailTemplate[] }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initial);
  const [selectedId, setSelectedId] = useState<string>(initial[0]?.id ?? "");
  const [draftSubject, setDraftSubject] = useState<string>(initial[0]?.subject ?? "");
  const [draftBody, setDraftBody] = useState<string>(initial[0]?.body ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = templates.find((t) => t.id === selectedId);

  function pick(id: string) {
    if (dirty && !confirm("Discard unsaved changes?")) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSelectedId(id);
    setDraftSubject(t.subject);
    setDraftBody(t.body);
    setDirty(false);
    setError(null);
  }

  async function save(): Promise<void> {
    if (!selected || saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: draftSubject,
          body: draftBody,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        lastEditedAt?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      const lastEditedAt = data.lastEditedAt ?? new Date().toISOString();
      // Reflect the canonical timestamp from the server into local state.
      setTemplates((list) =>
        list.map((t) =>
          t.id === selectedId
            ? {
                ...t,
                subject: draftSubject,
                body: draftBody,
                lastEditedAt,
              }
            : t,
        ),
      );
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!selected) return;
    setDraftSubject(selected.subject);
    setDraftBody(selected.body);
    setDirty(false);
    setError(null);
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <aside className="space-y-2">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            className={clsx(
              "w-full text-left rounded-2xl p-3 border transition",
              selectedId === t.id
                ? "bg-brand-primary/10 border-brand-primary/30"
                : "bg-white/50 border-white/60 hover:bg-white/70",
            )}
          >
            <p className="font-display text-sm font-semibold text-brand-ink">
              {t.name}
            </p>
            <p className="text-[10px] font-mono text-brand-primary mt-0.5">
              {t.key}
            </p>
            <p className="text-[10px] text-brand-muted mt-1">
              Edited {timeAgo(t.lastEditedAt)}
            </p>
          </button>
        ))}
      </aside>

      <GlassCard className="!p-6">
        {!selected ? (
          <p className="text-sm text-brand-muted">Select a template.</p>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                  Template key
                </p>
                <p className="font-mono text-sm text-brand-primary">
                  {selected.key}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dirty && !saving && (
                  <button onClick={reset} className="btn-glass text-xs">
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className={clsx(
                    "btn-brand text-xs",
                    (!dirty || saving) && "opacity-40 cursor-not-allowed",
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save size={11} /> Save
                    </>
                  )}
                </button>
              </div>
            </div>
            {error ? (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-3">
                {error}
              </div>
            ) : null}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1">
                  Subject
                </label>
                <GlassInput
                  value={draftSubject}
                  onChange={(e) => {
                    setDraftSubject(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1">
                  Body (plain text fallback)
                </label>
                <textarea
                  value={draftBody}
                  onChange={(e) => {
                    setDraftBody(e.target.value);
                    setDirty(true);
                  }}
                  rows={10}
                  className="glass-input w-full font-mono text-xs leading-relaxed resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1">
                  Variables
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selected.variables.map((v) => (
                    <code
                      key={v}
                      className="px-2 py-0.5 rounded-md bg-brand-ink/5 text-brand-primary text-[11px] font-mono"
                    >
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/60 border border-white/70 p-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2 inline-flex items-center gap-1.5">
                <Mail size={11} /> Live preview
              </p>
              <p className="text-sm font-semibold text-brand-ink">
                {fillVars(draftSubject, selected.variables)}
              </p>
              <p className="text-sm text-brand-ink/85 mt-2 whitespace-pre-wrap leading-relaxed">
                {fillVars(draftBody, selected.variables)}
              </p>
            </div>

            <p className="text-[10px] text-brand-muted mt-4">
              Saves persist to the <code className="text-brand-primary">emailTemplates</code>{" "}
              collection and audit-log immediately. The change takes effect
              on the next transactional send — no separate publish step.
            </p>
          </>
        )}
      </GlassCard>
    </div>
  );
}

function fillVars(s: string, vars: string[]): string {
  let out = s;
  const samples: Record<string, string> = {
    studentName: "Alice",
    recruiterName: "Tony",
    companyName: "Stark Industries",
    jobTitle: "Senior SDE",
    newStage: "Interview",
    nextAction: "30-min call Friday",
    slaHours: "72",
    verifyUrl: "https://unghost.com/verify-email/abc123…",
    resetUrl: "https://unghost.com/reset-password/xyz789…",
  };
  for (const v of vars) {
    out = out.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), samples[v] ?? `<${v}>`);
  }
  return out;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 1) return "moments ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

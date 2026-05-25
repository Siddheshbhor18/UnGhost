"use client";

import { useState } from "react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import { Eye, Loader2, Megaphone, Save, Trash2 } from "lucide-react";
import type { Campaign } from "@/shared/types";

/**
 * CampaignsClient — interactive editor + list.
 *
 *   • Left column: new/edit form. Server-generated ID on create; PATCH on edit.
 *   • Right column: full list with quick Publish toggle + Delete.
 *
 * Optimistic UI: edits land in local state immediately, fetch confirms in
 * background. On failure we revert and surface the error inline. No toast
 * lib here — the admin pages stay framework-light.
 */

const EMPTY: Campaign = {
  id: "",
  name: "",
  placement: "landing_hero",
  mediaUrl: "",
  headline: "",
  subtext: "",
  targetUrl: "",
  status: "draft",
  createdAt: new Date().toISOString().slice(0, 10),
};

interface Props {
  initial: Campaign[];
}

export function CampaignsClient({ initial }: Props) {
  const [list, setList] = useState<Campaign[]>(initial);
  const [editing, setEditing] = useState<Campaign>(EMPTY);
  const [busy, setBusy] = useState<"save" | "delete" | "toggle" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save(): Promise<void> {
    setErr(null);
    setBusy("save");
    try {
      const isUpdate = Boolean(editing.id);
      const url = isUpdate
        ? `/api/admin/campaigns/${editing.id}`
        : `/api/admin/campaigns`;
      const method = isUpdate ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          placement: editing.placement,
          mediaUrl: editing.mediaUrl,
          headline: editing.headline,
          subtext: editing.subtext,
          targetUrl: editing.targetUrl,
          status: editing.status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        campaign?: Campaign;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      if (isUpdate) {
        setList((prev) =>
          prev.map((c) => (c.id === data.campaign!.id ? data.campaign! : c)),
        );
      } else {
        setList((prev) => [data.campaign!, ...prev]);
      }
      setEditing({ ...EMPTY, createdAt: new Date().toISOString().slice(0, 10) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleStatus(c: Campaign): Promise<void> {
    setErr(null);
    setBusy("toggle");
    const nextStatus: Campaign["status"] = c.status === "live" ? "paused" : "live";
    // Optimistic update — flips immediately, server confirms.
    setList((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x)),
    );
    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Toggle failed");
    } catch (e) {
      // Roll back optimistic update.
      setList((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, status: c.status } : x)),
      );
      setErr(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: Campaign): Promise<void> {
    if (!confirm(`Delete campaign "${c.name}"? This is permanent.`)) return;
    setErr(null);
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/campaigns/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setList((prev) => prev.filter((x) => x.id !== c.id));
      if (editing.id === c.id) {
        setEditing({
          ...EMPTY,
          createdAt: new Date().toISOString().slice(0, 10),
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const canSave =
    editing.name.trim().length >= 2 &&
    editing.headline.trim().length >= 2 &&
    editing.targetUrl.trim().length > 0 &&
    busy !== "save";

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <GlassCard glow>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4 flex items-center gap-2">
          <Megaphone size={14} /> {editing.id ? "Edit Campaign" : "New Campaign"}
        </p>
        <div className="space-y-3">
          <Field label="Campaign internal name">
            <GlassInput
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
              }
            />
          </Field>
          <Field label="Banner placement">
            <GlassSelect
              value={editing.placement}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  placement: e.target.value as Campaign["placement"],
                })
              }
            >
              <option value="landing_hero">Landing Hero</option>
              <option value="dashboard_top">Student Dashboard · Top</option>
              <option value="bootcamp_inline">Bootcamp · Inline</option>
            </GlassSelect>
          </Field>
          <Field label="Banner media URL (optional)">
            <GlassInput
              value={editing.mediaUrl}
              onChange={(e) =>
                setEditing({ ...editing, mediaUrl: e.target.value })
              }
              placeholder="/banner.svg"
            />
          </Field>
          <Field label="Primary headline">
            <GlassInput
              value={editing.headline}
              onChange={(e) =>
                setEditing({ ...editing, headline: e.target.value })
              }
            />
          </Field>
          <Field label="Subtext">
            <GlassTextarea
              value={editing.subtext}
              onChange={(e) =>
                setEditing({ ...editing, subtext: e.target.value })
              }
            />
          </Field>
          <Field label="Target URL">
            <GlassInput
              value={editing.targetUrl}
              onChange={(e) =>
                setEditing({ ...editing, targetUrl: e.target.value })
              }
              placeholder="/signup or full URL"
            />
          </Field>
          <Field label="Status">
            <div className="flex gap-2">
              {(["draft", "live", "paused"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEditing({ ...editing, status: s })}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold capitalize transition ${
                    editing.status === s
                      ? "bg-brand-primary text-white border-brand-primary shadow-brand-glow"
                      : "bg-white/40 border-brand-ink/10 text-brand-muted hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {err ? (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {err}
            </div>
          ) : null}

          <div className="flex gap-2">
            <GlassButton
              variant="brand"
              size="md"
              onClick={save}
              disabled={!canSave}
            >
              {busy === "save" ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save size={14} /> {editing.id ? "Save changes" : "Create campaign"}
                </>
              )}
            </GlassButton>
            {editing.id ? (
              <GlassButton
                variant="glass"
                size="md"
                onClick={() =>
                  setEditing({
                    ...EMPTY,
                    createdAt: new Date().toISOString().slice(0, 10),
                  })
                }
              >
                Cancel edit
              </GlassButton>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            All Campaigns ({list.length})
          </p>
        </div>
        {list.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-brand-muted">
              No campaigns yet. Create your first one ←
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <div
                key={c.id}
                className="bg-white/40 rounded-xl p-4 border border-brand-ink/5 hover:border-brand-primary/30 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-brand-ink truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-brand-muted">{c.placement}</p>
                  </div>
                  <GlassBadge
                    tone={
                      c.status === "live"
                        ? "success"
                        : c.status === "paused"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {c.status}
                  </GlassBadge>
                </div>
                <p className="text-sm text-brand-ink">{c.headline}</p>
                {c.subtext ? (
                  <p className="text-xs text-brand-muted mt-1">{c.subtext}</p>
                ) : null}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-xs font-semibold rounded-lg border border-brand-primary text-brand-primary px-3 py-1.5 hover:bg-brand-primary hover:text-white transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(c)}
                    disabled={busy === "toggle"}
                    className="text-xs font-semibold rounded-lg border border-emerald-500 text-emerald-600 px-3 py-1.5 hover:bg-emerald-500 hover:text-white transition inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Eye size={12} />{" "}
                    {c.status === "live" ? "Pause" : "Publish"}
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busy === "delete"}
                    className="text-xs font-semibold rounded-lg border border-rose-300 text-rose-600 px-3 py-1.5 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition inline-flex items-center gap-1 ml-auto disabled:opacity-50"
                    aria-label="Delete campaign"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

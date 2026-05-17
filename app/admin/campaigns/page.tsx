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
import { Megaphone, Save, Eye } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  placement: "landing_hero" | "dashboard_top" | "bootcamp_inline";
  mediaUrl: string;
  headline: string;
  subtext: string;
  targetUrl: string;
  status: "draft" | "live" | "paused";
  createdAt: string;
}

const SEED: Campaign[] = [
  {
    id: "camp_launch_offer",
    name: "First Mission Launch Offer",
    placement: "landing_hero",
    mediaUrl: "",
    headline: "First mission free. No ghost, no catch.",
    subtext: "Recruiters guarantee a response in 24, 48, or 72 hours.",
    targetUrl: "/login",
    status: "live",
    createdAt: "2026-05-01",
  },
  {
    id: "camp_llm_bootcamp",
    name: "LLM Grounding Bootcamp Push",
    placement: "dashboard_top",
    mediaUrl: "",
    headline: "Close the LLM Grounding gap → unlock 3 new missions.",
    subtext: "₹4,999. 3 weeks. Live design review.",
    targetUrl: "/bootcamp/bc_llmgrounding",
    status: "live",
    createdAt: "2026-05-05",
  },
];

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

export default function CampaignsAdmin() {
  const [list, setList] = useState<Campaign[]>(SEED);
  const [editing, setEditing] = useState<Campaign>(EMPTY);

  function save() {
    if (!editing.id) {
      const next = { ...editing, id: `camp_${Date.now().toString(36)}` };
      setList([next, ...list]);
    } else {
      setList(list.map((c) => (c.id === editing.id ? editing : c)));
    }
    setEditing({ ...EMPTY, createdAt: new Date().toISOString().slice(0, 10) });
  }

  function toggleStatus(id: string) {
    setList((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "live" ? "draft" : "live" }
          : c,
      ),
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <GlassBadge tone="brand">Campaigns</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Banner &amp; Campaign Management
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Push announcements to the landing, dashboard, or bootcamp surfaces.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <GlassCard glow>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4 flex items-center gap-2">
            <Megaphone size={14} /> {editing.id ? "Edit Campaign" : "New Campaign"}
          </p>
          <div className="space-y-3">
            <Field label="Campaign internal name">
              <GlassInput
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
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
            <Field label="Banner media URL">
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
              />
            </Field>
            <Field label="Status">
              <div className="flex gap-2">
                {(["draft", "live", "paused"] as const).map((s) => (
                  <button
                    key={s}
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
            <GlassButton
              variant="brand"
              size="md"
              onClick={save}
              disabled={!editing.headline || !editing.name}
            >
              <Save size={14} /> Save Campaign
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
            All Campaigns
          </p>
          <div className="space-y-3">
            {list.map((c) => (
              <div
                key={c.id}
                className="bg-white/40 rounded-xl p-4 border border-brand-ink/5 hover:border-brand-primary/30 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-brand-ink">
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
                <p className="text-xs text-brand-muted mt-1">{c.subtext}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-xs font-semibold rounded-lg border border-brand-primary text-brand-primary px-3 py-1.5 hover:bg-brand-primary hover:text-white transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(c.id)}
                    className="text-xs font-semibold rounded-lg border border-emerald-500 text-emerald-600 px-3 py-1.5 hover:bg-emerald-500 hover:text-white transition inline-flex items-center gap-1"
                  >
                    <Eye size={12} /> {c.status === "live" ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

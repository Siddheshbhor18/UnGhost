"use client";

import { useState } from "react";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";
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

export default function CampaignsAdmin() {
  const [list, setList] = useState<Campaign[]>(SEED);
  const [editing, setEditing] = useState<Campaign>({
    id: "",
    name: "",
    placement: "landing_hero",
    mediaUrl: "",
    headline: "",
    subtext: "",
    targetUrl: "",
    status: "draft",
    createdAt: new Date().toISOString().slice(0, 10),
  });

  function save() {
    if (!editing.id) {
      const next = { ...editing, id: `camp_${Date.now().toString(36)}` };
      setList([next, ...list]);
    } else {
      setList(list.map((c) => (c.id === editing.id ? editing : c)));
    }
    setEditing({
      id: "",
      name: "",
      placement: "landing_hero",
      mediaUrl: "",
      headline: "",
      subtext: "",
      targetUrl: "",
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
    });
  }

  function toggleStatus(id: string) {
    setList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === "live" ? "draft" : "live" } : c)),
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <SectionHeader
        eyebrow="CAMPAIGNS"
        title="Banner & Campaign Management"
        subtitle="Push announcements to the landing, dashboard, or bootcamp surfaces."
        color="pink"
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <ArcadeCard glow="pink">
          <p className="font-pixel text-[10px] text-neon-pink mb-4 flex items-center gap-2">
            <Megaphone size={12} /> {editing.id ? "EDIT CAMPAIGN" : "NEW CAMPAIGN"}
          </p>
          <div className="space-y-3">
            <Field label="CAMPAIGN INTERNAL NAME">
              <input className="pixel-input w-full" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="BANNER PLACEMENT">
              <select
                className="pixel-input w-full"
                value={editing.placement}
                onChange={(e) => setEditing({ ...editing, placement: e.target.value as Campaign["placement"] })}
              >
                <option value="landing_hero">Landing Hero</option>
                <option value="dashboard_top">Student Dashboard · Top</option>
                <option value="bootcamp_inline">Bootcamp · Inline</option>
              </select>
            </Field>
            <Field label="BANNER MEDIA URL">
              <input className="pixel-input w-full" value={editing.mediaUrl} onChange={(e) => setEditing({ ...editing, mediaUrl: e.target.value })} placeholder="/banner.svg" />
            </Field>
            <Field label="PRIMARY HEADLINE">
              <input className="pixel-input w-full" value={editing.headline} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} />
            </Field>
            <Field label="SUBTEXT">
              <textarea className="pixel-input w-full" value={editing.subtext} onChange={(e) => setEditing({ ...editing, subtext: e.target.value })} />
            </Field>
            <Field label="TARGET URL">
              <input className="pixel-input w-full" value={editing.targetUrl} onChange={(e) => setEditing({ ...editing, targetUrl: e.target.value })} />
            </Field>
            <Field label="STATUS">
              <div className="flex gap-2">
                {(["draft", "live", "paused"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setEditing({ ...editing, status: s })}
                    className={`flex-1 border-2 py-2 font-pixel text-[10px] ${
                      editing.status === s ? "border-neon-green text-neon-green bg-neon-green/10" : "border-bg-ink text-ink-muted"
                    }`}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
            <PixelButton variant="green" size="md" onClick={save} disabled={!editing.headline || !editing.name}>
              <Save size={12} /> Save Campaign
            </PixelButton>
          </div>
        </ArcadeCard>

        <ArcadeCard>
          <p className="font-pixel text-[10px] text-neon-blue mb-4">▸ ALL CAMPAIGNS</p>
          <div className="space-y-3">
            {list.map((c) => (
              <div key={c.id} className="border-2 border-bg-ink p-3 hover:border-neon-pink transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-pixel text-xs text-neon-pink">{c.name}</p>
                    <p className="font-mono text-[10px] text-ink-muted">{c.placement}</p>
                  </div>
                  <Badge tone={c.status === "live" ? "green" : c.status === "paused" ? "yellow" : "muted"}>
                    {c.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="font-mono text-xs text-ink-primary">{c.headline}</p>
                <p className="font-mono text-[10px] text-ink-muted mt-1">{c.subtext}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-[10px] font-pixel border border-neon-blue text-neon-blue px-2 py-1 hover:bg-neon-blue hover:text-black"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => toggleStatus(c.id)}
                    className="text-[10px] font-pixel border border-neon-green text-neon-green px-2 py-1 hover:bg-neon-green hover:text-black inline-flex items-center gap-1"
                  >
                    <Eye size={10} /> {c.status === "live" ? "UNPUBLISH" : "PUBLISH"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ArcadeCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-pixel text-[10px] text-ink-muted block mb-1">{label}</label>
      {children}
    </div>
  );
}

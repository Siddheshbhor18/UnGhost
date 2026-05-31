"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Sparkles } from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassNavbar,
  GlassSelect,
} from "@/components/glass";
import type { BootcampCategory } from "@/shared/types";
import { ROOMS } from "@/shared/rooms";

const CATEGORIES: Array<{ value: BootcampCategory; label: string }> = ROOMS.map(
  (r) => ({ value: r.id, label: r.label }),
);

export default function NewBootcampPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [category, setCategory] = useState<BootcampCategory>("ai");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!title.trim() || !skill.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/bootcamps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, skill, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create");
        return;
      }
      router.push(`/instructor/studio/${data.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-2xl px-4 pt-10 pb-12">
        <Link
          href="/instructor/studio"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-3"
        >
          <ChevronLeft size={14} /> Studio
        </Link>

        <div className="mb-6">
          <GlassBadge tone="warn">
            <Sparkles size={11} /> New bootcamp
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Start the seed
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Three fields to spin it up · the full editor opens next · admin
            review before it goes live.
          </p>
        </div>

        <GlassCard className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
              Title
            </label>
            <GlassInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LLM Grounding for Production Engineers"
              maxLength={80}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
                Primary skill
              </label>
              <GlassInput
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="LLM Grounding"
                maxLength={40}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
                Category
              </label>
              <GlassSelect
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as BootcampCategory)
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </GlassSelect>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-700 bg-rose-500/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <GlassButton
              variant="brand"
              size="md"
              onClick={create}
              disabled={!title.trim() || !skill.trim() || creating}
            >
              {creating ? "Creating…" : (
                <>
                  <Plus size={12} /> Create &amp; open editor
                </>
              )}
            </GlassButton>
          </div>
        </GlassCard>

        <p className="text-[11px] text-brand-muted text-center mt-4">
          Defaults: ₹2,499 · 3 weeks · status &ldquo;draft&rdquo; · empty lesson
          list. Edit everything next.
        </p>
      </div>
    </main>
  );
}

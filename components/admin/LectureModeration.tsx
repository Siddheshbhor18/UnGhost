"use client";

import { useState } from "react";
import { GlassCard } from "@/components/glass";
import { Trash2, Video, ExternalLink } from "lucide-react";
import { roomLabel } from "@/shared/rooms";
import type { RoomLecture } from "@/shared/types";

type Row = RoomLecture & { recruiterName: string };

export function LectureModeration({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function takedown(id: string) {
    if (!confirm("Take down this lecture? Students will no longer see it.")) {
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/lectures/${id}`, {
        method: "DELETE",
      });
      if (res.ok) setRows((r) => r.filter((x) => x.id !== id));
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <GlassCard className="text-center py-12 text-sm text-brand-muted">
        No lectures posted yet.
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((lec) => (
        <GlassCard key={lec.id} className="flex items-center gap-4 !py-3">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shrink-0">
            <Video size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-brand-ink text-sm truncate">
              {lec.title}
            </p>
            <p className="text-xs text-brand-muted">
              {roomLabel(lec.room)} · by {lec.recruiterName} ·{" "}
              {new Date(lec.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
          <a
            href={lec.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-muted hover:text-brand-primary shrink-0"
          >
            <ExternalLink size={13} /> View
          </a>
          <button
            onClick={() => takedown(lec.id)}
            disabled={busy === lec.id}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 shrink-0 disabled:opacity-50"
          >
            <Trash2 size={14} /> {busy === lec.id ? "Removing…" : "Take down"}
          </button>
        </GlassCard>
      ))}
    </div>
  );
}

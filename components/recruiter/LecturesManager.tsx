"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import { Upload, Trash2, Video, Plus } from "lucide-react";
import { ROOMS, roomLabel } from "@/shared/rooms";
import type { RoomLecture } from "@/shared/types";

const ACCEPT = "video/mp4,video/webm,video/quicktime";

export function LecturesManager({ initial }: { initial: RoomLecture[] }) {
  const router = useRouter();
  const [lectures, setLectures] = useState<RoomLecture[]>(initial);

  const [room, setRoom] = useState<string>(ROOMS[0].id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setPct(0);
    try {
      const presignRes = await fetch("/api/recruiter/upload-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name,
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) {
        const d = await presignRes.json().catch(() => ({}));
        throw new Error(d.error ?? `presign failed (${presignRes.status})`);
      }
      const { uploadUrl, publicUrl, headers } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
        headers: Record<string, string>;
      };
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        for (const [k, v] of Object.entries(headers)) {
          xhr.setRequestHeader(k, v);
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`upload HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(file);
      });
      setVideoUrl(publicUrl);
      setPct(100);
    } catch (err) {
      setError((err as Error).message);
      setPct(null);
    }
  }

  const resolvedUrl = source === "youtube" ? youtubeUrl.trim() : videoUrl;
  const canSubmit =
    title.trim().length >= 3 && resolvedUrl.length > 0 && !saving && pct !== 0;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/lectures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          room,
          title: title.trim(),
          description: description.trim(),
          videoUrl: resolvedUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't post the lecture.");
        return;
      }
      setLectures((l) => [data as RoomLecture, ...l]);
      setTitle("");
      setDescription("");
      setYoutubeUrl("");
      setVideoUrl("");
      setPct(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/recruiter/lectures/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setLectures((l) => l.filter((x) => x.id !== id));
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <GlassCard className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
              Room
            </label>
            <GlassSelect value={room} onChange={(e) => setRoom(e.target.value)}>
              {ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </GlassSelect>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
              Video source
            </label>
            <GlassSelect
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "upload" | "youtube")
              }
            >
              <option value="upload">Upload a file</option>
              <option value="youtube">Paste a YouTube link</option>
            </GlassSelect>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
            Title
          </label>
          <GlassInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cold outbound that actually books meetings"
            maxLength={160}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
            Description
          </label>
          <GlassTextarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two lines on what students will take away."
            className="min-h-[80px]"
            maxLength={2000}
          />
        </div>

        {source === "youtube" ? (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
              YouTube URL
            </label>
            <GlassInput
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
            />
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
              Video file (mp4 / webm / mov · up to 500 MB)
            </label>
            <label className="flex items-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-brand-primary/30 bg-white/30 px-4 py-3 hover:border-brand-primary hover:bg-white/50 transition text-sm text-brand-muted">
              <Upload size={16} />
              {videoUrl
                ? "Video uploaded — ready to post"
                : pct !== null
                  ? `Uploading… ${pct}%`
                  : "Choose a video file"}
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadFile(f);
                }}
              />
            </label>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-700 bg-rose-500/10 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <GlassButton
            variant="brand"
            size="md"
            onClick={submit}
            disabled={!canSubmit}
          >
            {saving ? (
              "Posting…"
            ) : (
              <>
                <Plus size={14} /> Post lecture
              </>
            )}
          </GlassButton>
        </div>
      </GlassCard>

      {/* Existing lectures */}
      <div>
        <h2 className="font-display font-bold text-lg text-brand-ink mb-3">
          Your lectures
        </h2>
        {lectures.length === 0 ? (
          <GlassCard className="text-center py-10 text-sm text-brand-muted">
            No lectures yet. Post your first one above.
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {lectures.map((lec) => (
              <GlassCard
                key={lec.id}
                className="flex items-center gap-4 !py-3"
              >
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shrink-0">
                  <Video size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-ink text-sm truncate">
                    {lec.title}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {roomLabel(lec.room)} room
                  </p>
                </div>
                <button
                  onClick={() => remove(lec.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 shrink-0"
                >
                  <Trash2 size={14} /> Remove
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

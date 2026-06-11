"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, RotateCw } from "lucide-react";

/**
 * Close / reopen control for a recruiter's own mission. Closing sets the job
 * inactive (hidden from students, stops new applications); reopening restores
 * it. The owning recruiter check is enforced server-side in PATCH /api/jobs/[id].
 */
export function JobActions({
  jobId,
  active,
}: {
  jobId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [isActive, setIsActive] = useState(active);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !isActive }),
      });
      if (res.ok) {
        setIsActive((v) => !v);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition disabled:opacity-50 ${
        isActive
          ? "text-rose-700 border-rose-500/30 hover:bg-rose-500/10"
          : "text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10"
      }`}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : isActive ? (
        <Power size={12} />
      ) : (
        <RotateCw size={12} />
      )}
      {isActive ? "Close mission" : "Reopen"}
    </button>
  );
}

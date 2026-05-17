"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { GlassButton } from "@/components/glass";

interface Result {
  scanned: number;
  breached: number;
  warningsT12: number;
  warningsT4: number;
}

export function SlaSweepButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/cron/sla-sweep", { method: "POST" });
      const data: Result & { error?: string } = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setResult(data);
      // Refresh page so KPI numbers reflect the sweep
      setTimeout(() => router.refresh(), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <GlassButton
        variant="brand"
        size="md"
        onClick={run}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Sweeping…
          </>
        ) : (
          <>
            <ShieldAlert size={14} /> Run SLA sweep
          </>
        )}
      </GlassButton>
      {result && (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
          <CheckCircle2 size={12} />
          {result.scanned} scanned · {result.breached} breached ·{" "}
          {result.warningsT12 + result.warningsT4} warnings fired
        </span>
      )}
    </div>
  );
}

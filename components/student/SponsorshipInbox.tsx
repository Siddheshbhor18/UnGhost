"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Gift,
  GraduationCap,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { Bootcamp, Sponsorship } from "@/shared/types";

interface Props {
  /** Initial offers from server (status === "offered" only). */
  initial: Sponsorship[];
  /** Lookup of bootcamps for display. */
  bootcamps: Record<string, Bootcamp>;
}

export function SponsorshipInbox({ initial, bootcamps }: Props) {
  const [offers, setOffers] = useState<Sponsorship[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const visible = useMemo(
    () => offers.filter((o) => o.status === "offered"),
    [offers],
  );

  if (visible.length === 0 && !confirmedId) return null;

  async function act(id: string, action: "accept" | "decline") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/student/sponsorships/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data: Sponsorship & { error?: string } = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setOffers((prev) =>
        prev.map((o) => (o.id === id ? data : o)),
      );
      if (action === "accept") setConfirmedId(id);
    } finally {
      setBusyId(null);
    }
  }

  // Acceptance success banner
  if (confirmedId) {
    const offer = offers.find((o) => o.id === confirmedId);
    const bc = offer ? bootcamps[offer.bootcampId] : undefined;
    return (
      <GlassCard
        glow
        className="!p-5 mb-6 bg-emerald-500/5 border-emerald-500/30"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-emerald-500 text-white shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-emerald-700">
              Sponsorship accepted — bootcamp unlocked
            </p>
            <p className="text-sm text-brand-ink/85 mt-1">
              <span className="font-semibold">{offer?.companyName}</span> has
              covered your seat in{" "}
              <span className="font-semibold text-brand-primary">
                {bc?.title}
              </span>
              . Complete it to earn your certification.
            </p>
          </div>
          <Link
            href={
              bc ? `/student/my-bootcamps/${bc.id}/learn` : "/bootcamps"
            }
            className="btn-brand shrink-0"
          >
            <GraduationCap size={14} /> Start learning →
          </Link>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3 mb-6">
      {visible.map((o) => {
        const bc = bootcamps[o.bootcampId];
        const expiresIn = Math.max(
          0,
          Math.ceil(
            (new Date(o.expiresAt).getTime() - Date.now()) / 86400_000,
          ),
        );
        return (
          <GlassCard
            key={o.id}
            glow
            className="!p-5 bg-gradient-to-br from-brand-primary/8 via-white/60 to-white/40"
          >
            <div className="flex items-start gap-3 flex-wrap">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                <Gift size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GlassBadge tone="brand">
                    <Sparkles size={10} /> Sponsorship offered
                  </GlassBadge>
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                    {expiresIn}d to accept
                  </span>
                </div>
                <p className="font-display font-bold text-lg text-brand-ink line-clamp-1">
                  {bc?.title ?? "Bootcamp"}
                </p>
                <p className="text-sm text-brand-ink/85 mt-0.5">
                  <span className="font-semibold">{o.companyName}</span> wants
                  to fund your seat — likely tied to a role they have you in
                  pipeline for.
                </p>
                <p className="text-xs text-brand-muted mt-2">
                  ₹{bc?.priceINR.toLocaleString("en-IN") ?? o.pricePaid} value ·{" "}
                  Closes the {bc?.skill ?? "skill"} gap · Non-refundable once
                  accepted
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <GlassButton
                  variant="glass"
                  size="md"
                  onClick={() => act(o.id, "decline")}
                  disabled={busyId === o.id}
                >
                  <XCircle size={12} /> Decline
                </GlassButton>
                <GlassButton
                  variant="brand"
                  size="md"
                  onClick={() => act(o.id, "accept")}
                  disabled={busyId === o.id}
                >
                  {busyId === o.id ? "…" : (
                    <>
                      <CheckCircle2 size={12} /> Accept
                    </>
                  )}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

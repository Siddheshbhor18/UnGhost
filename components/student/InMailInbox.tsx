"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Inbox,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { InMail } from "@/shared/types";

interface Props {
  initial: InMail[];
}

export function InMailInbox({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<InMail[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items],
  );

  if (pending.length === 0) return null;

  async function act(id: string, action: "accept" | "decline") {
    setBusy(true);
    try {
      const res = await fetch(`/api/student/inmail/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data: InMail & { error?: string; threadId?: string } =
        await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
      setOpenId(null);
      // On accept, the API materialises the message thread and returns its id.
      // Hop straight into the chat so "Accept & open chat" actually opens chat.
      if (action === "accept" && data.threadId) {
        router.push(`/student/messages/${data.threadId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-3 mb-6">
        {pending.map((im) => (
          <GlassCard
            key={im.id}
            glow
            className="!p-5 bg-gradient-to-br from-brand-secondary/8 via-white/60 to-white/40"
          >
            <div className="flex items-start gap-3 flex-wrap">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                <Mail size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <GlassBadge tone="brand">
                    <Sparkles size={10} /> Recruiter outreach
                  </GlassBadge>
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                    InMail
                  </span>
                </div>
                <p className="font-display font-bold text-base text-brand-ink line-clamp-1">
                  {im.subject}
                </p>
                <p className="text-sm text-brand-ink/85 mt-0.5 flex items-center gap-1.5">
                  <Building2 size={11} className="text-brand-primary" />
                  <span className="font-semibold">{im.companyName}</span>
                  {im.jobTitle && (
                    <>
                      {" · "}
                      <span className="text-brand-muted">{im.jobTitle}</span>
                    </>
                  )}
                </p>
                <p className="text-xs text-brand-muted mt-2 line-clamp-2 leading-relaxed">
                  {im.body}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <GlassButton
                  variant="glass"
                  size="md"
                  onClick={() => setOpenId(im.id)}
                >
                  Read full →
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Full message modal */}
      {openId &&
        (() => {
          const im = items.find((i) => i.id === openId);
          if (!im) return null;
          return (
            <div className="fixed inset-0 z-[60] grid place-items-center p-4">
              <div
                className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
                onClick={() => setOpenId(null)}
              />
              <GlassCard
                variant="strong"
                className="relative !p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <GlassBadge tone="brand">
                      <Mail size={10} /> InMail
                    </GlassBadge>
                    <h2 className="font-display font-bold text-xl text-brand-ink mt-2">
                      {im.subject}
                    </h2>
                    <p className="text-xs text-brand-muted mt-1">
                      From {im.recruiterName} ·{" "}
                      <span className="font-semibold">{im.companyName}</span>
                      {im.jobTitle && ` · ${im.jobTitle}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setOpenId(null)}
                    className="text-brand-muted hover:text-rose-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="text-sm text-brand-ink leading-relaxed whitespace-pre-wrap py-3 border-y border-brand-ink/5">
                  {im.body}
                </div>

                <div className="mt-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-start gap-2">
                  <ShieldCheck
                    size={14}
                    className="text-emerald-600 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Accept reveals your contact and opens a 2-way thread. Decline is
                    polite and locks them out for 90 days. Ignore for 14 days and
                    they get their credit refunded automatically.
                  </p>
                </div>

                <div className="flex gap-2 mt-5">
                  <GlassButton
                    variant="glass"
                    fullWidth
                    onClick={() => act(im.id, "decline")}
                    disabled={busy}
                  >
                    <XCircle size={12} /> Decline
                  </GlassButton>
                  <GlassButton
                    variant="brand"
                    fullWidth
                    onClick={() => act(im.id, "accept")}
                    disabled={busy}
                  >
                    {busy ? "…" : (
                      <>
                        <CheckCircle2 size={12} /> Accept &amp; open chat
                      </>
                    )}
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          );
        })()}
    </>
  );
}

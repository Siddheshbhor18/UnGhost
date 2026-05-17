"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Copy,
  Crown,
  Loader2,
  Mail,
  ShieldCheck,
  UserX,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
} from "@/components/glass";
import type { User } from "@/shared/types";

interface Props {
  initial: User[];
  selfId: string;
  selfIsAdmin: boolean;
  companyId: string;
  companyName: string;
}

export function TeamClient({
  initial,
  selfId,
  selfIsAdmin,
  companyId,
  companyName,
}: Props) {
  const router = useRouter();
  const [list, setList] = useState<User[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?invite=${encodeURIComponent(companyId)}`;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function remove(id: string) {
    if (!confirm("Remove this recruiter from the company?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/company/team/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed");
        return;
      }
      setList((prev) => prev.filter((u) => u.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Invite link card (admins only) */}
      {selfIsAdmin ? (
        <GlassCard glow className="!p-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Mail size={11} /> Invite a teammate
          </p>
          <p className="text-sm text-brand-ink/85 mb-3 leading-relaxed">
            Share this link with someone you want on the {companyName}{" "}
            recruiter team. Signing up via this link auto-attaches them to the
            company.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              readOnly
              value={inviteLink}
              className="glass-input flex-1 font-mono text-xs min-w-0"
              onFocus={(e) => e.currentTarget.select()}
            />
            <GlassButton variant="brand" size="sm" onClick={copyInvite}>
              <Copy size={11} /> {copied ? "Copied" : "Copy"}
            </GlassButton>
          </div>
          <p className="text-[10px] text-brand-muted mt-2">
            Phase 1: link is informational — Phase 2 wires real invite-token
            flow with 7-day expiry.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="!p-4 bg-brand-ink/5">
          <p className="text-sm text-brand-muted">
            You&apos;re a recruiter on {companyName}. Only Company Admins can
            invite or remove team members.
          </p>
        </GlassCard>
      )}

      {/* Team list */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Team · {list.length}
        </p>
        {list.map((u) => {
          const isSelf = u.id === selfId;
          return (
            <GlassCard key={u.id} className="!p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow font-display font-bold text-base shrink-0">
                    {u.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-brand-ink">
                      {u.name}{" "}
                      {isSelf && (
                        <span className="text-[10px] text-brand-muted font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brand-muted">{u.email}</p>
                  </div>
                  {u.isCompanyAdmin && (
                    <GlassBadge tone="warn">
                      <Crown size={9} /> Company Admin
                    </GlassBadge>
                  )}
                  {u.status === "suspended" && (
                    <GlassBadge tone="danger">Suspended</GlassBadge>
                  )}
                </div>
                {selfIsAdmin && !isSelf && !u.isCompanyAdmin && (
                  <GlassButton
                    variant="glass"
                    size="sm"
                    onClick={() => remove(u.id)}
                    disabled={busyId === u.id}
                    className="!text-rose-700"
                  >
                    {busyId === u.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <UserX size={11} />
                    )}
                    Remove
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="!p-4 bg-brand-ink/5">
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1 inline-flex items-center gap-1.5">
          <ShieldCheck size={11} /> Audit trail
        </p>
        <p className="text-xs text-brand-muted leading-relaxed">
          Every invite, removal, and admin role change is audit-logged. Admins
          can view via{" "}
          <span className="text-brand-ink font-semibold">/admin/audit</span>.
        </p>
      </GlassCard>
    </div>
  );
}

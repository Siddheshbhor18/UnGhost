"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Ghost,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserX,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { StudentProfile, User } from "@/shared/types";

interface Props {
  user: User;
}

export function SettingsClient({ user }: Props) {
  const router = useRouter();
  const p = user.profile!;
  const [searchVisibility, setSearchVisibility] = useState<boolean>(
    p.searchVisibility ?? true,
  );
  const [applicationIdentity, setApplicationIdentity] = useState<
    "named" | "anonymous"
  >(p.applicationIdentity ?? "named");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(patch: Partial<StudentProfile>) {
    try {
      await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      setToast("Saved · synced to recruiter database in real-time.");
      setTimeout(() => setToast(null), 2200);
    } catch {
      setToast("Couldn't save — try again.");
    }
  }

  async function exportData() {
    window.location.href = "/api/student/me/export";
  }

  async function deleteAccount() {
    if (deleteText !== "DELETE") return;
    setBusy(true);
    setDeleteError(null);
    try {
      // Hardened endpoint: confirms password, strips PII, marks soft_deleted,
      // and revokes live sessions. (The old /api/student/me/delete only set a
      // flag — the account stayed fully usable.)
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(
          data.error === "wrong_password"
            ? "Incorrect password."
            : data.error === "password_required"
            ? "Enter your password to confirm."
            : data.message ?? data.error ?? "Couldn't delete. Try again.",
        );
        return;
      }
      // Session is revoked server-side; sign out clears the client cookie too.
      await signOut({ redirect: false }).catch(() => {});
      router.push("/login");
    } catch {
      setDeleteError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Privacy ────────────────────────────────────────────── */}
      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
          <ShieldCheck size={11} /> Privacy &amp; visibility
        </p>

        {/* searchVisibility */}
        <div className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4 mb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-sm text-brand-ink flex items-center gap-2">
                {searchVisibility ? (
                  <Eye size={13} className="text-brand-primary" />
                ) : (
                  <EyeOff size={13} className="text-rose-600" />
                )}
                Allow recruiters to find me in the database
              </p>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                When off, you&apos;re fully invisible to recruiter search — they
                can only see you if you apply directly. When on, your visibility
                tier follows your trajectory (Actively hunting = top of feeds).
              </p>
            </div>
            <Toggle
              checked={searchVisibility}
              onChange={(v) => {
                setSearchVisibility(v);
                persist({ searchVisibility: v });
              }}
            />
          </div>
        </div>

        {/* applicationIdentity */}
        <div className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4">
          <p className="font-display font-semibold text-sm text-brand-ink flex items-center gap-2 mb-2">
            <Ghost size={13} className="text-brand-primary" />
            How you appear when you apply
          </p>
          <p className="text-xs text-brand-muted mb-3 leading-relaxed">
            Anonymous hides your name + photo from recruiters until you advance
            past Stage 1. Named (default) shows them immediately.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <IdentityChoice
              active={applicationIdentity === "named"}
              icon="👤"
              label="Named"
              desc="Default · faster trust"
              onClick={() => {
                setApplicationIdentity("named");
                persist({ applicationIdentity: "named" });
              }}
            />
            <IdentityChoice
              active={applicationIdentity === "anonymous"}
              icon="👻"
              label="Anonymous"
              desc="Skills-only · bias-reduced"
              onClick={() => {
                setApplicationIdentity("anonymous");
                persist({ applicationIdentity: "anonymous" });
              }}
            />
          </div>
        </div>
      </GlassCard>

      {/* ── Subscription ──────────────────────────────────────── */}
      <SubscriptionCard user={user} />

      {/* ── DPDP: Data export ──────────────────────────────────── */}
      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
          <Download size={11} /> Your data
        </p>
        <p className="text-sm text-brand-ink/90 leading-relaxed mb-3">
          Download a full JSON bundle of everything we store about you —
          profile, applications, sponsorships, InMails, messages, notifications.
          DPDP-compliant. Mumbai-resident.
        </p>
        <GlassButton variant="glass" size="md" onClick={exportData}>
          <Download size={12} /> Download my data
        </GlassButton>
      </GlassCard>

      {/* ── Danger zone ────────────────────────────────────────── */}
      <GlassCard className="bg-rose-500/5 border-rose-500/20">
        <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-3 flex items-center gap-1.5">
          <AlertTriangle size={11} /> Danger zone
        </p>
        <p className="text-sm text-brand-ink/90 leading-relaxed mb-3">
          Delete your account. 30-day grace period — within that window you can
          recover by signing in. After 30 days, PII is anonymised; financial +
          audit trails are preserved per Indian record retention law.
        </p>
        {!confirmDelete ? (
          <GlassButton
            variant="glass"
            size="md"
            onClick={() => setConfirmDelete(true)}
            className="!text-rose-700"
          >
            <UserX size={12} /> Delete my account
          </GlassButton>
        ) : (
          <div className="rounded-2xl bg-white/40 border border-rose-500/20 p-4">
            <p className="text-sm text-brand-ink/90 mb-3">
              Type <span className="font-mono font-bold">DELETE</span> and enter
              your password to confirm:
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="w-full bg-white/60 border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-brand-ink mb-2 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              placeholder="DELETE"
            />
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white/60 border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-brand-ink mb-3 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              placeholder="Your password"
            />
            {deleteError && (
              <p className="text-xs text-rose-700 font-semibold mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <GlassButton
                variant="glass"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteText("");
                  setDeletePassword("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="brand"
                onClick={deleteAccount}
                disabled={deleteText !== "DELETE" || busy}
                className="!bg-rose-500"
              >
                <Trash2 size={12} />
                {busy ? "Deleting…" : "Yes, delete forever"}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 inset-x-4 z-40 md:inset-x-auto md:right-6 md:max-w-sm">
          <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-glass-lg p-4 flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="text-emerald-600 mt-0.5 shrink-0"
            />
            <p className="text-sm text-brand-ink flex-1">{toast}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Subscription block — shows the current plan (Free or Premium) and the
 * upgrade action. Premium is an annual plan; grandfathered launch buyers
 * (no planExpiresAt) keep lifetime access.
 */
function SubscriptionCard({ user }: { user: User }) {
  const isPremium = (user.plan ?? "free") === "premium";
  const isLifetime = isPremium && !user.planExpiresAt;
  const renewsOn = user.planExpiresAt
    ? new Date(user.planExpiresAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <GlassCard>
      <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
        <Sparkles size={11} /> Subscription
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display font-bold text-brand-ink">
            {isPremium
              ? isLifetime
                ? "Premium · lifetime"
                : "Premium · 1 year"
              : "Free · trial"}{" "}
            <GlassBadge tone={isPremium ? "brand" : "neutral"} className="ml-1">
              current
            </GlassBadge>
          </p>
          <p className="text-xs text-brand-muted mt-0.5">
            {isPremium
              ? isLifetime
                ? "Unlimited applications · AI Coach · all bootcamps · forever."
                : `Unlimited applications · AI Coach · all bootcamps. Access until ${renewsOn}.`
              : "2 lifetime applications. Upgrade to Premium for unlimited access."}
          </p>
        </div>
        <div className="flex gap-2">
          {isPremium ? (
            <a href="/dashboard" className="text-xs font-semibold text-brand-primary">
              Open dashboard →
            </a>
          ) : (
            <a href="/upgrade" className="btn-brand">
              Upgrade
            </a>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition shrink-0 ${
        checked ? "bg-brand-primary shadow-brand-glow" : "bg-brand-ink/10"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 grid place-items-center w-5 h-5 rounded-full bg-white shadow transition ${
          checked ? "left-5" : "left-0.5"
        }`}
      >
        {checked && (
          <CheckCircle2 size={12} className="text-brand-primary" />
        )}
      </span>
    </button>
  );
}

function IdentityChoice({
  active,
  icon,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition ${
        active
          ? "bg-brand-primary/10 border-brand-primary shadow-brand-glow"
          : "bg-white/40 border-brand-ink/10 hover:border-brand-primary/40"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <p className="font-display font-semibold text-sm text-brand-ink mt-1">
        {label}
      </p>
      <p className="text-xs text-brand-muted mt-0.5">{desc}</p>
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserX,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { Role, User } from "@/shared/types";

interface Props {
  user: User;
  currentAdminId: string;
}

type Mode = "idle" | "suspending" | "banning" | "rolechanging" | "submitting";

// Roles an admin may assign here. Admin is excluded — admin provisioning is
// script-only (mirrors the server-side ASSIGNABLE_ROLES guard).
const ASSIGNABLE_ROLES: Role[] = ["student", "recruiter", "instructor"];

export function UserActionsCard({ user, currentAdminId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<7 | 14 | 30>(7);
  const [newRole, setNewRole] = useState<Role>(
    user.role === "student" ? "recruiter" : "student",
  );

  const status = user.status ?? "active";
  const isSelf = user.id === currentAdminId;

  async function callAction(body: {
    action: "suspend" | "ban" | "restore" | "set_role";
    durationDays?: number;
    reason?: string;
    role?: Role;
  }) {
    setMode("submitting");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Action failed");
        setMode("idle");
        return;
      }
      setMode("idle");
      setReason("");
      router.refresh();
    } catch {
      alert("Network error");
      setMode("idle");
    }
  }

  if (isSelf) {
    return (
      <GlassCard className="!p-5">
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
          Admin actions
        </p>
        <p className="text-sm text-brand-muted mt-2">
          You can&apos;t moderate your own admin account.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      className={`!p-5 ${
        status === "active"
          ? ""
          : "bg-rose-500/5 border-rose-500/20"
      }`}
    >
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            Admin actions
          </p>
          <p className="text-sm text-brand-muted mt-1">
            Every action is audit-logged. Suspension is time-bound; ban is
            permanent until manually restored.
          </p>
        </div>
        <StatusChip user={user} />
      </div>

      {status === "suspended" && user.suspendedReason && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 mb-3">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-1">
            Reason · suspended{" "}
            {user.suspendedAt
              ? new Date(user.suspendedAt).toLocaleDateString("en-IN")
              : ""}
            {user.suspendedUntil && (
              <>
                {" "}· until{" "}
                {new Date(user.suspendedUntil).toLocaleDateString("en-IN")}
              </>
            )}
          </p>
          <p className="text-sm text-rose-800">{user.suspendedReason}</p>
        </div>
      )}

      {status === "banned" && user.suspendedReason && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 mb-3">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-1">
            Permanently banned
          </p>
          <p className="text-sm text-rose-800">{user.suspendedReason}</p>
        </div>
      )}

      {mode === "suspending" && (
        <div className="space-y-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
            Suspend account
          </p>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1">
              Duration
            </label>
            <div className="flex gap-1.5">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d as 7 | 14 | 30)}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    duration === d
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white/40 border-brand-ink/10 text-brand-muted hover:border-amber-500/50"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1">
              Reason (visible to the user)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Reported by 3 candidates for ghosting · 90-day rate exceeded threshold."
              className="w-full bg-white/60 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p
              className={`text-[10px] mt-1 ${
                reason.length >= 10 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {reason.length} / 10 min chars
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => {
                setMode("idle");
                setReason("");
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() =>
                callAction({
                  action: "suspend",
                  durationDays: duration,
                  reason,
                })
              }
              disabled={reason.length < 10}
            >
              Suspend {duration} days
            </GlassButton>
          </div>
        </div>
      )}

      {mode === "banning" && (
        <div className="space-y-3 rounded-xl bg-rose-500/5 border border-rose-500/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold">
            Permanently ban
          </p>
          <p className="text-xs text-brand-muted">
            User cannot sign back in. Restore is manual. Use for abuse, fraud,
            or repeated TOS violations.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Document the violation clearly. Visible to the user in the suspension notice."
            className="w-full bg-white/60 border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          <p
            className={`text-[10px] ${
              reason.length >= 10 ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {reason.length} / 10 min chars
          </p>
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => {
                setMode("idle");
                setReason("");
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() => callAction({ action: "ban", reason })}
              disabled={reason.length < 10}
              className="!bg-rose-500"
            >
              Ban permanently
            </GlassButton>
          </div>
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          {status === "active" && (
            <>
              <GlassButton
                variant="glass"
                size="sm"
                onClick={() => setMode("suspending")}
              >
                <Clock size={12} /> Suspend
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setMode("banning")}
                className="!text-rose-700"
              >
                <UserX size={12} /> Ban
              </GlassButton>
            </>
          )}
          {(status === "suspended" || status === "banned") && (
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() => callAction({ action: "restore" })}
            >
              <ShieldCheck size={12} /> Restore account
            </GlassButton>
          )}
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setMode("rolechanging")}
          >
            <UserCog size={12} /> Change role
          </GlassButton>
        </div>
      )}

      {mode === "rolechanging" && (
        <div className="space-y-3 rounded-xl bg-brand-primary/5 border border-brand-primary/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            Change account role
          </p>
          <p className="text-xs text-brand-muted">
            Current role:{" "}
            <span className="font-semibold text-brand-ink">{user.role}</span>.
            Changing it signs the user out on all devices; they must sign in
            again. Admin can&apos;t be assigned here.
          </p>
          <div className="flex gap-1.5">
            {ASSIGNABLE_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setNewRole(r)}
                disabled={r === user.role}
                className={`flex-1 rounded-xl border py-2 text-xs font-semibold capitalize transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  newRole === r && r !== user.role
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white/40 border-brand-ink/10 text-brand-muted hover:border-brand-primary/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={() => setMode("idle")}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="brand"
              size="sm"
              onClick={() => callAction({ action: "set_role", role: newRole })}
              disabled={newRole === user.role}
            >
              Set role to {newRole}
            </GlassButton>
          </div>
        </div>
      )}

      {mode === "submitting" && (
        <div className="flex items-center gap-2 text-sm text-brand-muted">
          <Loader2 size={14} className="animate-spin text-brand-primary" />
          Applying action…
        </div>
      )}
    </GlassCard>
  );
}

function StatusChip({ user }: { user: User }) {
  const status = user.status ?? "active";
  if (status === "active")
    return (
      <GlassBadge tone="success">
        <CheckCircle2 size={10} /> Active
      </GlassBadge>
    );
  if (status === "suspended")
    return (
      <GlassBadge tone="warn">
        <Clock size={10} /> Suspended
      </GlassBadge>
    );
  if (status === "banned")
    return (
      <GlassBadge tone="danger">
        <ShieldAlert size={10} /> Banned
      </GlassBadge>
    );
  return (
    <GlassBadge tone="neutral">
      <AlertTriangle size={10} /> {status}
    </GlassBadge>
  );
}

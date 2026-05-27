"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  ExternalLink,
  Flag,
  Loader2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { formatPaiseAsINR } from "@/server/payments/pricing";

/**
 * ApprovalQueue — the per-row table the admin uses to action submissions.
 *
 *   • Approve: one click → POST /approve → status moves out of queue.
 *   • Reject:  one click → `prompt()` for reason → POST /reject with reason.
 *   • Flag:    one click → POST /flag (notes optional, prompt for them).
 *
 * After any action, router.refresh() re-runs the server component so the
 * queue updates. Optimistic locking isn't needed — the API short-circuits
 * if the submission's already actioned (409 with a friendly message).
 *
 * PhonePe deep-link: each row carries a "Verify in PhonePe ↗" link that
 * opens the merchant portal with the UTR pre-filled (URL pattern still
 * TBD — current placeholder hits the business dashboard root).
 */

export interface QueueRow {
  id: string;
  studentName: string;
  studentEmail: string;
  bootcampTitle: string;
  expectedAmountInPaise: number;
  utr: string;
  upiApp: string;
  payerMobile: string;
  status: "pending_verification" | "flagged";
  createdAt: string;
}

const PHONEPE_MERCHANT_BASE = "https://business.phonepe.com/transactions";

export function ApprovalQueue({ rows }: { rows: QueueRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white/70 border border-brand-ink/10 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 grid place-items-center mb-3">
          <Check size={20} className="text-emerald-600" />
        </div>
        <p className="font-display font-bold text-brand-ink">All caught up</p>
        <p className="text-sm text-brand-muted mt-1">
          No pending or flagged submissions. Sit tight — they land here as
          students submit.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/80 border border-brand-ink/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-brand-ink/[0.04] text-brand-muted text-[11px] uppercase tracking-wider font-semibold">
          <tr>
            <th className="text-left px-4 py-3">Student</th>
            <th className="text-left px-4 py-3">Plan / Bootcamp</th>
            <th className="text-right px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">UTR</th>
            <th className="text-left px-4 py-3">Submitted</th>
            <th className="text-right px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ActionRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionRow({ row }: { row: QueueRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | "flag" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(
    action: "approve" | "reject" | "flag",
    body?: Record<string, string>,
  ): Promise<void> {
    setBusy(action);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/payment-submissions/${row.id}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `Action failed (${res.status})`);
      }
      // Pull fresh queue from server.
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
      setBusy(null);
    }
  }

  function handleReject(): void {
    const reason = window.prompt(
      "Reason for rejection (sent to student via email):",
    );
    if (!reason || reason.trim().length < 3) return;
    act("reject", { reason: reason.trim() });
  }

  function handleFlag(): void {
    const notes = window.prompt(
      "Optional internal notes (admin-only — not sent to student):",
    );
    act("flag", notes && notes.trim() ? { notes: notes.trim() } : undefined);
  }

  return (
    <tr
      className={clsx(
        "border-t border-brand-ink/5 align-top transition-opacity",
        busy && "opacity-50",
        row.status === "flagged" && "bg-amber-50/40",
      )}
    >
      <td className="px-4 py-3">
        <p className="font-semibold text-brand-ink">{row.studentName}</p>
        <p className="text-[11px] text-brand-muted">{row.studentEmail}</p>
        <p className="text-[10px] text-brand-muted/80 mt-1 tnum">
          {row.payerMobile} · {row.upiApp}
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="text-brand-ink">{row.bootcampTitle}</p>
        {row.status === "flagged" ? (
          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700">
            <Flag size={9} /> Flagged
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-right tnum font-semibold text-brand-ink">
        {formatPaiseAsINR(row.expectedAmountInPaise)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-[11px] font-mono bg-brand-ink/[0.04] rounded px-1.5 py-0.5">
            {row.utr}
          </code>
          {/* PhonePe merchant portal deep-link — opens business dashboard with the UTR available for quick search. */}
          <a
            href={`${PHONEPE_MERCHANT_BASE}?search=${encodeURIComponent(row.utr)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Verify in PhonePe merchant portal"
            className="text-[10px] text-brand-primary font-semibold hover:underline inline-flex items-center gap-0.5"
          >
            Verify <ExternalLink size={9} />
          </a>
        </div>
      </td>
      <td className="px-4 py-3 text-[12px] text-brand-muted tnum">
        {new Date(row.createdAt).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        })}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1.5">
          <ActionButton
            onClick={() => act("approve")}
            disabled={busy !== null}
            spinning={busy === "approve"}
            label="Approve"
            tone="approve"
            icon={<Check size={12} />}
          />
          <ActionButton
            onClick={handleReject}
            disabled={busy !== null}
            spinning={busy === "reject"}
            label="Reject"
            tone="reject"
            icon={<X size={12} />}
          />
          <ActionButton
            onClick={handleFlag}
            disabled={busy !== null}
            spinning={busy === "flag"}
            label="Flag"
            tone="flag"
            icon={<Flag size={12} />}
            hidden={row.status === "flagged"}
          />
        </div>
        {err ? (
          <p className="text-[10px] text-rose-600 mt-1.5 text-right">{err}</p>
        ) : null}
      </td>
    </tr>
  );
}

function ActionButton({
  onClick,
  disabled,
  spinning,
  label,
  tone,
  icon,
  hidden,
}: {
  onClick: () => void;
  disabled: boolean;
  spinning: boolean;
  label: string;
  tone: "approve" | "reject" | "flag";
  icon: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  const toneCls =
    tone === "approve"
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : tone === "reject"
        ? "bg-rose-600 hover:bg-rose-700 text-white"
        : "bg-amber-500 hover:bg-amber-600 text-white";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        toneCls,
      )}
    >
      {spinning ? <Loader2 size={11} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

// Suppress unused import warning — kept parked for the future row-detail
// expansion (click-through to a side panel with full UTR history).
void ChevronRight;

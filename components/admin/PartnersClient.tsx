"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import type { Partner, PartnerStats } from "@/shared/types";

/**
 * PartnersClient — admin channel-partner manager UI.
 *
 *   • Empty state with a "Create your first partner" CTA.
 *   • Table with: name, code, link copy, signups, paid conversions,
 *     commission %, est. earnings, action buttons (rotate token, deactivate).
 *   • Inline create form (no separate page — admin loop is fast).
 *
 * State mutations call /api/admin/partners + /api/admin/partners/[id]
 * then router.refresh() so the table re-renders with fresh stats.
 */
type PartnerWithStats = Partner & { stats: PartnerStats };

interface Props {
  initial: PartnerWithStats[];
}

// Public origin baked into the client bundle at build time. Renders identical
// link strings on server + client so there's no hydration mismatch. Falls
// back to a relative path if unset (degrades gracefully).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export function PartnersClient({ initial }: Props) {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerWithStats[]>(initial);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function create(form: CreateForm) {
    setErr(null);
    setBusyId("__new__");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.partner) {
        setErr(data.error ?? "Could not create partner.");
        return;
      }
      // Fresh row has stats=0 across the board.
      setPartners((prev) => [
        { ...data.partner, stats: zeroStats(data.partner.id) },
        ...prev,
      ]);
      setCreating(false);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function rotate(id: string) {
    if (!confirm("Rotate this partner's dashboard URL? Their current link will stop working.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rotate-token" }),
      });
      const data = await res.json();
      if (!res.ok || !data.partner) return;
      setPartners((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, dashboardToken: data.partner.dashboardToken } : p,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this partner? New signups via their link won't be attributed. Historical stats are preserved.")) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setPartners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: false } : p)),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {err ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {err}
        </div>
      ) : null}

      <div className="flex justify-end">
        {creating ? null : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-4 py-2 text-sm font-semibold hover:bg-brand-primary/90 transition"
          >
            <Plus size={14} /> New partner
          </button>
        )}
      </div>

      {creating ? (
        <CreateForm
          onCancel={() => setCreating(false)}
          onSubmit={create}
          submitting={busyId === "__new__"}
        />
      ) : null}

      {partners.length === 0 ? (
        <GlassCard className="text-center !py-12">
          <Handshake />
          <p className="font-display font-bold text-brand-ink mt-3">
            No partners yet
          </p>
          <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
            Create your first partner. They get a unique referral link + their
            own dashboard URL to track conversions.
          </p>
        </GlassCard>
      ) : (
        <div className="rounded-2xl border border-brand-ink/10 bg-white/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-ink/5 text-brand-muted text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="text-left px-4 py-2.5">Partner</th>
                <th className="text-left px-4 py-2.5">Referral link</th>
                <th className="text-right px-4 py-2.5">Signups</th>
                <th className="text-right px-4 py-2.5">Pro</th>
                <th className="text-right px-4 py-2.5">Premium</th>
                <th className="text-right px-4 py-2.5">Comm.</th>
                <th className="text-right px-4 py-2.5">Earned</th>
                <th className="text-right px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <PartnerRow
                  key={p.id}
                  p={p}
                  busy={busyId === p.id}
                  onRotate={() => rotate(p.id)}
                  onDeactivate={() => deactivate(p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PartnerRow({
  p,
  busy,
  onRotate,
  onDeactivate,
}: {
  p: PartnerWithStats;
  busy: boolean;
  onRotate: () => void;
  onDeactivate: () => void;
}) {
  const referralLink = `${APP_URL}/?ref=${p.code}`;
  const dashboardLink = `${APP_URL}/p/${p.code}?key=${p.dashboardToken}`;
  return (
    <tr className="border-t border-brand-ink/10 align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-brand-ink">{p.name}</p>
        <p className="text-[11px] text-brand-muted">{p.contactEmail}</p>
        <p className="text-[10px] font-mono text-brand-muted/80 mt-1">{p.code}</p>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <CopyLine label="Referral" value={referralLink} />
          <CopyLine label="Partner dashboard" value={dashboardLink} />
        </div>
      </td>
      <td className="px-4 py-3 text-right tnum font-semibold text-brand-ink">
        {p.stats.signups}
      </td>
      <td className="px-4 py-3 text-right tnum text-brand-ink">{p.stats.paidPro}</td>
      <td className="px-4 py-3 text-right tnum text-brand-ink">{p.stats.paidPremium}</td>
      <td className="px-4 py-3 text-right tnum text-brand-muted">{p.commissionPct}%</td>
      <td className="px-4 py-3 text-right tnum font-semibold text-brand-ink">
        ₹{p.stats.estCommissionINR.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 text-right">
        {p.active ? (
          <GlassBadge tone="success">Active</GlassBadge>
        ) : (
          <GlassBadge tone="neutral">Off</GlassBadge>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-1">
          <button
            disabled={busy}
            onClick={onRotate}
            className="grid place-items-center w-7 h-7 rounded-md border border-brand-ink/10 hover:border-brand-ink/25 hover:bg-brand-ink/[0.04] transition disabled:opacity-50"
            title="Rotate dashboard token"
          >
            <KeyRound size={12} />
          </button>
          {p.active ? (
            <button
              disabled={busy}
              onClick={onDeactivate}
              className="grid place-items-center w-7 h-7 rounded-md border border-brand-ink/10 hover:border-rose-300 hover:bg-rose-50 text-rose-600 transition disabled:opacity-50"
              title="Deactivate"
            >
              <Trash2 size={12} />
            </button>
          ) : null}
          <a
            href={dashboardLink}
            target="_blank"
            rel="noopener noreferrer"
            className="grid place-items-center w-7 h-7 rounded-md border border-brand-ink/10 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition"
            title="Open dashboard"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      </td>
    </tr>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — let the user select manually */
    }
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold w-[100px] shrink-0">
        {label}
      </span>
      <code className="flex-1 text-[10px] font-mono bg-brand-ink/[0.04] rounded px-1.5 py-0.5 truncate">
        {value}
      </code>
      <button
        onClick={copy}
        className="grid place-items-center w-6 h-6 rounded border border-brand-ink/10 hover:border-brand-ink/25 hover:bg-brand-ink/[0.04] transition shrink-0"
        aria-label="Copy"
        title={copied ? "Copied!" : "Copy"}
      >
        {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

interface CreateForm {
  name: string;
  contactEmail: string;
  commissionPct: number;
  code?: string;
  notes?: string;
}

function CreateForm({
  onSubmit,
  onCancel,
  submitting,
}: {
  onSubmit: (f: CreateForm) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [commissionPct, setCommissionPct] = useState(15);
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(contactEmail) &&
    commissionPct >= 0 &&
    commissionPct <= 50;

  return (
    <GlassCard className="!p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-display font-bold text-brand-ink">New partner</p>
        <button
          onClick={onCancel}
          className="grid place-items-center w-7 h-7 rounded-md border border-brand-ink/10 hover:border-brand-ink/25 transition"
        >
          <X size={12} />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Partner name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            placeholder="Acme College Mumbai"
          />
        </Field>
        <Field label="Contact email *">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            placeholder="ops@acme.in"
          />
        </Field>
        <Field label="Commission %">
          <input
            type="number"
            min={0}
            max={50}
            value={commissionPct}
            onChange={(e) => setCommissionPct(Number(e.target.value))}
            className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
          />
        </Field>
        <Field label="Custom code (optional)">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            placeholder="acme-college-mumbai"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-brand-ink/15 bg-white px-3 py-2 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition h-20 resize-none"
              placeholder="Where you met, deal terms, etc."
            />
          </Field>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-brand-ink border border-brand-ink/10 hover:border-brand-ink/25 transition"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit({
              name,
              contactEmail,
              commissionPct,
              code: code || undefined,
              notes: notes || undefined,
            })
          }
          disabled={!canSubmit || submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-4 py-2 text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-50 transition"
        >
          {submitting ? "Creating…" : "Create partner"}
        </button>
      </div>
    </GlassCard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

function Handshake() {
  return (
    <span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
        <path d="m21 3 1 11h-2" />
        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
        <path d="M3 4h8" />
      </svg>
    </span>
  );
}

function zeroStats(partnerId: string): PartnerStats {
  return {
    partnerId,
    signups: 0,
    paidPro: 0,
    paidPremium: 0,
    estCommissionINR: 0,
  };
}

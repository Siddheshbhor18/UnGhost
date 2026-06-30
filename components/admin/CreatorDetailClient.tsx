"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Mail,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import {
  Card,
  Button,
  Modal,
  Badge,
  Field,
  Input,
  Textarea,
  EmptyState,
  useToast,
} from "@/components/ui";
import { CommissionSetter } from "@/components/admin/CreatorsClient";
import {
  commissionRateLabel,
  formatINR,
  formatDate,
  previewCommissionPaise,
  REWARD_STATUS_TONE,
  CREATOR_STATUS_TONE,
} from "@/components/admin/creatorUi";
import {
  BOOTCAMP_BASE_PAISE,
  type CommissionType,
  type CommissionAgreement,
  type CreatorProfile,
  type CreatorReward,
  type CreditLedgerEntry,
} from "@/shared/types/creator";

export interface CreatorDetail {
  creatorId: string;
  name: string;
  email: string;
  profile: CreatorProfile;
  activeAgreement: CommissionAgreement | null;
  agreementHistory: CommissionAgreement[];
  balancePaise: number;
  referrals: number;
  rewards: CreatorReward[];
  ledger: CreditLedgerEntry[];
}

type TabKey = "rewards" | "ledger" | "timeline" | "settings";

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: "rewards", label: "Rewards" },
  { key: "ledger", label: "Ledger" },
  { key: "timeline", label: "Timeline" },
  { key: "settings", label: "Settings" },
];

export function CreatorDetailClient({ detail }: { detail: CreatorDetail }) {
  const router = useRouter();
  const { push } = useToast();
  const { profile } = detail;

  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>("rewards");
  const [changeOpen, setChangeOpen] = useState(false);

  /** Shared mutation runner: fetch → toast → refresh. Returns success. */
  async function run(
    url: string,
    init: RequestInit,
    successMsg: string,
  ): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        push({
          title: "Couldn't complete that action",
          description: data.error,
          tone: "error",
        });
        return false;
      }
      push({ title: successMsg, tone: "success" });
      router.refresh();
      return true;
    } catch {
      push({ title: "Network error. Please try again.", tone: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function patch(
    body: Record<string, unknown>,
    successMsg: string,
  ): Promise<boolean> {
    return run(
      `/api/admin/creators/${detail.creatorId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      successMsg,
    );
  }

  function suspend() {
    const reason = window.prompt("Reason for suspension (visible in the audit trail):");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      push({ title: "A reason of at least 3 characters is required.", tone: "warning" });
      return;
    }
    void patch({ action: "suspend", reason: reason.trim() }, "Creator suspended");
  }

  function terminate() {
    const reason = window.prompt(
      "Terminate this creator? This is permanent. Reason (visible in the audit trail):",
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      push({ title: "A reason of at least 3 characters is required.", tone: "warning" });
      return;
    }
    void patch({ action: "terminate", reason: reason.trim() }, "Creator terminated");
  }

  function reactivate() {
    void patch({ action: "reactivate" }, "Creator reactivated");
  }

  function invite() {
    void run(
      `/api/admin/creators/${detail.creatorId}/invite`,
      { method: "POST" },
      "Invitation sent",
    );
  }

  function verifyPayment() {
    void patch({ action: "verifyPayment" }, "Payment details verified");
  }

  async function changeCommission(body: {
    type: CommissionType;
    value: number;
    notes?: string;
  }): Promise<void> {
    const ok = await run(
      `/api/admin/creators/${detail.creatorId}/commission`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      "Commission updated",
    );
    if (ok) setChangeOpen(false);
  }

  const status = profile.status;
  const canVerifyPayment = Boolean(
    profile.paymentDetails && !profile.paymentDetails.verified,
  );

  return (
    <div className="space-y-6">
      <CommissionCard
        active={detail.activeAgreement}
        history={detail.agreementHistory}
        onChange={() => setChangeOpen(true)}
        disabled={busy || status === "terminated"}
      />

      <Card>
        <p className="section-label mb-3">Actions</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            leadingIcon={<Mail size={16} />}
            onClick={invite}
            disabled={busy || status === "terminated"}
          >
            {status === "pending" ? "Send invitation" : "Resend invitation"}
          </Button>

          {canVerifyPayment && (
            <Button
              variant="secondary"
              leadingIcon={<ShieldCheck size={16} />}
              onClick={verifyPayment}
              disabled={busy}
            >
              Verify payment details
            </Button>
          )}

          {(status === "active" || status === "pending") && (
            <Button
              variant="secondary"
              leadingIcon={<PauseCircle size={16} />}
              onClick={suspend}
              disabled={busy}
            >
              Suspend
            </Button>
          )}

          {status === "suspended" && (
            <Button
              variant="secondary"
              leadingIcon={<PlayCircle size={16} />}
              onClick={reactivate}
              disabled={busy}
            >
              Reactivate
            </Button>
          )}

          {status !== "terminated" && (
            <Button
              variant="destructive"
              leadingIcon={<Ban size={16} />}
              onClick={terminate}
              disabled={busy}
            >
              Terminate
            </Button>
          )}
        </div>
      </Card>

      <div>
        <div className="flex gap-1 border-b border-neutral-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "px-4 py-2.5 text-body-sm font-medium -mb-px border-b-2 transition",
                tab === t.key
                  ? "border-brand-500 text-brand-ink"
                  : "border-transparent text-brand-muted hover:text-brand-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="pt-4">
          {tab === "rewards" && <RewardsTab rewards={detail.rewards} />}
          {tab === "ledger" && <LedgerTab ledger={detail.ledger} />}
          {tab === "timeline" && (
            <TimelineTab
              profile={profile}
              history={detail.agreementHistory}
            />
          )}
          {tab === "settings" && (
            <SettingsTab
              profile={profile}
              busy={busy}
              onSaveProfile={(body) => patch(body, "Profile updated")}
              onVerifyPayment={verifyPayment}
              canVerifyPayment={canVerifyPayment}
            />
          )}
        </div>
      </div>

      <ChangeCommissionModal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        active={detail.activeAgreement}
        submitting={busy}
        onSubmit={changeCommission}
      />
    </div>
  );
}

function CommissionCard({
  active,
  history,
  onChange,
  disabled,
}: {
  active: CommissionAgreement | null;
  history: CommissionAgreement[];
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Active commission</p>
          <p className="font-display text-3xl font-bold text-brand-ink mt-1 tnum">
            {active ? commissionRateLabel(active.type, active.value) : "Not set"}
          </p>
          {active && (
            <p className="text-body-sm text-neutral-500 mt-1">
              On a {formatINR(BOOTCAMP_BASE_PAISE)} sale → earns{" "}
              <span className="font-semibold text-brand-ink tnum">
                {formatINR(previewCommissionPaise(active.type, active.value))}
              </span>
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          leadingIcon={<Pencil size={16} />}
          onClick={onChange}
          disabled={disabled}
        >
          Change commission
        </Button>
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-neutral-200 pt-4">
          <p className="section-label mb-2">Agreement history</p>
          <ul className="space-y-1.5">
            {history.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-body-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-brand-ink tnum">
                    {commissionRateLabel(a.type, a.value)}
                  </span>
                  <Badge tone={a.status === "active" ? "success" : "neutral"}>
                    {a.status}
                  </Badge>
                </span>
                <span className="text-neutral-500 tnum">
                  {formatDate(a.effectiveFrom)}
                  {a.supersededAt ? ` → ${formatDate(a.supersededAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function ChangeCommissionModal({
  open,
  onClose,
  active,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  active: CommissionAgreement | null;
  submitting: boolean;
  onSubmit: (body: {
    type: CommissionType;
    value: number;
    notes?: string;
  }) => void;
}) {
  // Prefill from the current agreement. Fixed agreements store paise; the field
  // edits rupees.
  const initialType: CommissionType = active?.type ?? "percentage";
  const initialValue = active
    ? active.type === "fixed"
      ? String(active.value / 100)
      : String(active.value)
    : "15";

  const [type, setType] = useState<CommissionType>(initialType);
  const [value, setValue] = useState(initialValue);
  const [notes, setNotes] = useState("");

  const numeric = Number(value);
  const valuePaise = type === "fixed" ? Math.round(numeric * 100) : numeric;
  const previewPaise = previewCommissionPaise(type, valuePaise);
  const valid =
    Number.isFinite(numeric) &&
    (type === "percentage"
      ? numeric >= 0 && numeric <= 50
      : valuePaise > 0 && valuePaise <= BOOTCAMP_BASE_PAISE);

  function submit() {
    if (!valid) return;
    onSubmit({ type, value: valuePaise, notes: notes.trim() || undefined });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change commission"
      description="Creates a new active agreement and supersedes the current one. Past rewards keep their original snapshot."
      size="md"
    >
      <div className="space-y-4">
        <CommissionSetter
          type={type}
          onType={setType}
          value={value}
          onValue={setValue}
          previewPaise={previewPaise}
        />
        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is the rate changing?"
            rows={2}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
          <Button variant="tertiary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || submitting} loading={submitting}>
            Save commission
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RewardsTab({ rewards }: { rewards: CreatorReward[] }) {
  if (rewards.length === 0) {
    return (
      <EmptyState
        title="No rewards yet"
        description="Rewards appear here once an attributed student completes a qualifying purchase."
      />
    );
  }
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="section-label text-left">
            <tr className="border-b border-neutral-200">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Rate</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 text-neutral-600 tnum">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-4 py-3 text-neutral-600 tnum">
                  {commissionRateLabel(r.commissionType, r.commissionValue)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-brand-ink tnum">
                  {formatINR(r.calculatedAmount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={REWARD_STATUS_TONE[r.status]}>{r.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LedgerTab({ ledger }: { ledger: CreditLedgerEntry[] }) {
  if (ledger.length === 0) {
    return (
      <EmptyState
        title="No ledger entries"
        description="Credits and debits appear here as rewards are earned and payouts are processed."
      />
    );
  }
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-body-sm">
          <thead className="section-label text-left">
            <tr className="border-b border-neutral-200">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((e) => {
              const credit = e.type === "credit";
              return (
                <tr key={e.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-600 tnum">
                    {formatDate(e.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {e.referenceType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{e.description ?? "—"}</td>
                  <td
                    className={clsx(
                      "px-4 py-3 text-right font-semibold tnum",
                      credit ? "text-success" : "text-error",
                    )}
                  >
                    {credit ? "+" : "−"}
                    {formatINR(e.amountPaise)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TimelineTab({
  profile,
  history,
}: {
  profile: CreatorProfile;
  history: CommissionAgreement[];
}) {
  const events = useMemo(() => {
    const items: { at: string; label: string }[] = [];
    items.push({ at: profile.createdAt, label: "Creator created" });
    if (profile.invitedAt) items.push({ at: profile.invitedAt, label: "Invitation issued" });
    if (profile.acceptedAt) items.push({ at: profile.acceptedAt, label: "Account activated" });
    if (profile.suspendedAt) {
      items.push({
        at: profile.suspendedAt,
        label: profile.suspendedReason
          ? `Suspended — ${profile.suspendedReason}`
          : "Suspended",
      });
    }
    if (profile.terminatedAt) items.push({ at: profile.terminatedAt, label: "Terminated" });
    if (profile.paymentDetails?.verifiedAt) {
      items.push({ at: profile.paymentDetails.verifiedAt, label: "Payment details verified" });
    }
    for (const a of history) {
      items.push({
        at: a.effectiveFrom,
        label: `Commission set to ${commissionRateLabel(a.type, a.value)}`,
      });
    }
    return items.sort((x, y) => (x.at < y.at ? 1 : -1));
  }, [profile, history]);

  return (
    <Card>
      <ol className="space-y-4">
        {events.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
              {i < events.length - 1 && (
                <span className="w-px flex-1 bg-neutral-200 mt-1" />
              )}
            </div>
            <div className="pb-1">
              <p className="text-body-sm text-brand-ink">{e.label}</p>
              <p className="text-body-xs text-neutral-500 tnum">
                {formatDate(e.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function SettingsTab({
  profile,
  busy,
  onSaveProfile,
  onVerifyPayment,
  canVerifyPayment,
}: {
  profile: CreatorProfile;
  busy: boolean;
  onSaveProfile: (body: Record<string, unknown>) => Promise<boolean>;
  onVerifyPayment: () => void;
  canVerifyPayment: boolean;
}) {
  const [instagram, setInstagram] = useState(profile.socialLinks.instagram ?? "");
  const [youtube, setYoutube] = useState(profile.socialLinks.youtube ?? "");
  const [linkedin, setLinkedin] = useState(profile.socialLinks.linkedin ?? "");
  const [twitter, setTwitter] = useState(profile.socialLinks.twitter ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  function save() {
    const socialLinks: Record<string, string> = {};
    if (instagram.trim()) socialLinks.instagram = instagram.trim();
    if (youtube.trim()) socialLinks.youtube = youtube.trim();
    if (linkedin.trim()) socialLinks.linkedin = linkedin.trim();
    if (twitter.trim()) socialLinks.twitter = twitter.trim();
    void onSaveProfile({
      action: "updateProfile",
      socialLinks,
      bio: bio.trim() || undefined,
    });
  }

  const pd = profile.paymentDetails;

  return (
    <div className="space-y-6">
      <Card>
        <p className="section-label mb-3">Profile</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Instagram">
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field label="YouTube">
            <Input
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="https://youtube.com/@…"
            />
          </Field>
          <Field label="LinkedIn">
            <Input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field label="Twitter / X">
            <Input
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="https://x.com/…"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Bio">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Short creator bio"
            />
          </Field>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={save} disabled={busy} loading={busy}>
            Save profile
          </Button>
        </div>
      </Card>

      <Card>
        <p className="section-label mb-3">Payment details</p>
        {pd ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
              <DetailРRow label="Method" value={pd.method === "upi" ? "UPI" : "Bank transfer"} />
              <DetailРRow label="Account" value={pd.accountRef} />
              {pd.accountName && <DetailРRow label="Account name" value={pd.accountName} />}
              {pd.ifsc && <DetailРRow label="IFSC" value={pd.ifsc} />}
            </div>
            <div className="flex items-center gap-3">
              <Badge
                tone={pd.verified ? "success" : "warning"}
                leadingIcon={pd.verified ? <CheckCircle2 size={14} /> : undefined}
              >
                {pd.verified ? "Verified" : "Unverified"}
              </Badge>
              {canVerifyPayment && (
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={<ShieldCheck size={14} />}
                  onClick={onVerifyPayment}
                  disabled={busy}
                >
                  Verify
                </Button>
              )}
            </div>
            {!pd.verified && (
              <p className="text-body-xs text-neutral-500">
                Payouts are blocked until payment details are verified.
              </p>
            )}
          </div>
        ) : (
          <p className="text-body-sm text-neutral-500">
            The creator hasn't added payout details yet.
          </p>
        )}
      </Card>
    </div>
  );
}

function DetailРRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className="text-brand-ink font-medium">{value}</span>
    </div>
  );
}

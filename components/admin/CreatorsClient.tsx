"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronRight } from "lucide-react";
import clsx from "clsx";
import {
  Card,
  Button,
  Modal,
  Badge,
  Chip,
  Input,
  Field,
  EmptyState,
  useToast,
} from "@/components/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import {
  CREATOR_STATUS_TONE,
  commissionRateLabel,
  formatINR,
  previewCommissionPaise,
  referralUrl,
} from "@/components/admin/creatorUi";
import {
  BOOTCAMP_BASE_PAISE,
  MAX_COMMISSION_PERCENT,
  type CommissionType,
  type CreatorStatus,
  type SocialLinks,
} from "@/shared/types/creator";

/** Roster row — the server page enriches each profile with the backing user's
 *  name/email, derived balance, lifetime earnings, and active commission. */
export interface CreatorRow {
  creatorId: string;
  referralCode: string;
  status: CreatorStatus;
  name: string;
  email: string;
  balancePaise: number;
  lifetimePaise: number;
  commissionType: CommissionType | null;
  commissionValue: number | null;
}

interface CreateBody {
  name: string;
  email: string;
  socialLinks?: SocialLinks;
  commission: { type: CommissionType; value: number };
}

const STATUS_FILTERS: readonly { value: CreatorStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
];

const CREATE_ERROR: Record<string, string> = {
  email_taken: "A user with this email already exists.",
  code_taken: "That referral code is already taken.",
};

export function CreatorsClient({ initial }: { initial: CreatorRow[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CreatorStatus | "all">("all");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initial.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.referralCode.toLowerCase().includes(needle)
      );
    });
  }, [initial, query, status]);

  async function create(body: CreateBody) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/creators", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        referralUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.referralUrl) {
        setError(
          (data.error && CREATE_ERROR[data.error]) ??
            "Could not onboard creator. Check the details and try again.",
        );
        return;
      }
      const url = data.referralUrl;
      try {
        await navigator.clipboard.writeText(url);
        push({
          title: "Creator onboarded — link copied",
          description: url,
          tone: "success",
        });
      } catch {
        push({ title: "Creator onboarded", description: url, tone: "success" });
      }
      setOnboardOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openOnboard() {
    setError(null);
    setOnboardOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[260px] flex-1 max-w-md">
          <Input
            leadingIcon={<Search size={16} />}
            placeholder="Search name, email, or code"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fieldSize="sm"
            aria-label="Search creators"
          />
        </div>
        <Button leadingIcon={<Plus size={16} />} onClick={openOnboard}>
          Onboard creator
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            active={status === f.value}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {initial.length === 0 ? (
        <Card>
          <EmptyState
            illustration={<Plus size={32} strokeWidth={1.6} />}
            title="No creators yet"
            description="Onboard your first creator to hand them a permanent referral link and start tracking attributed sales."
            action={
              <Button leadingIcon={<Plus size={16} />} onClick={openOnboard}>
                Onboard your first creator
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead className="section-label text-left">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 font-semibold">Creator</th>
                  <th className="px-4 py-3 font-semibold">Code</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Active rate</th>
                  <th className="px-4 py-3 font-semibold text-right">Lifetime earned</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance</th>
                  <th className="px-4 py-3 font-semibold text-right">Link</th>
                  <th className="px-2 py-3" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CreatorTableRow key={c.creatorId} c={c} />
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-body-sm text-neutral-500">
              No creators match your search.
            </p>
          )}
        </Card>
      )}

      <Modal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        title="Onboard creator"
        description="Create a creator, set their commission, and get a permanent referral link."
        size="md"
      >
        <OnboardForm
          onSubmit={create}
          onCancel={() => setOnboardOpen(false)}
          submitting={submitting}
          error={error}
        />
      </Modal>
    </div>
  );
}

function CreatorTableRow({ c }: { c: CreatorRow }) {
  const router = useRouter();
  const href = `/admin/creators/${c.creatorId}`;
  const link = referralUrl(c.referralCode);
  return (
    <tr
      onClick={() => router.push(href)}
      className="border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-25 transition"
    >
      <td className="px-4 py-3">
        <p className="font-semibold text-brand-ink">{c.name}</p>
        <p className="text-body-xs text-neutral-500">{c.email}</p>
      </td>
      <td className="px-4 py-3">
        <code className="text-body-xs font-mono text-neutral-600 bg-neutral-100 rounded px-1.5 py-0.5">
          {c.referralCode}
        </code>
      </td>
      <td className="px-4 py-3">
        <Badge tone={CREATOR_STATUS_TONE[c.status]}>{c.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right tnum text-brand-ink">
        {c.commissionType && c.commissionValue !== null
          ? commissionRateLabel(c.commissionType, c.commissionValue)
          : "—"}
      </td>
      <td className="px-4 py-3 text-right tnum font-semibold text-brand-ink">
        {formatINR(c.lifetimePaise)}
      </td>
      <td
        className={clsx(
          "px-4 py-3 text-right tnum font-semibold",
          c.balancePaise < 0 ? "text-error" : "text-brand-ink",
        )}
      >
        {formatINR(c.balancePaise)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <CopyButton value={link} />
        </div>
      </td>
      <td className="px-2 py-3 text-neutral-300">
        <ChevronRight size={16} />
      </td>
    </tr>
  );
}

function OnboardForm({
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  onSubmit: (body: CreateBody) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [type, setType] = useState<CommissionType>("percentage");
  const [value, setValue] = useState("15");

  const numeric = Number(value);
  // For fixed agreements the field is in rupees; the API + preview want paise.
  const valuePaise = type === "fixed" ? Math.round(numeric * 100) : numeric;
  const previewPaise = previewCommissionPaise(type, valuePaise);

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const valueOk =
    Number.isFinite(numeric) &&
    (type === "percentage"
      ? numeric >= 0 && numeric <= MAX_COMMISSION_PERCENT
      : valuePaise > 0 && valuePaise <= BOOTCAMP_BASE_PAISE);
  const canSubmit = name.trim().length >= 2 && emailOk && valueOk && !submitting;

  function buildSocialLinks(): SocialLinks | undefined {
    const links: SocialLinks = {};
    if (instagram.trim()) links.instagram = instagram.trim();
    if (youtube.trim()) links.youtube = youtube.trim();
    if (linkedin.trim()) links.linkedin = linkedin.trim();
    if (twitter.trim()) links.twitter = twitter.trim();
    return Object.keys(links).length > 0 ? links : undefined;
  }

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      socialLinks: buildSocialLinks(),
      commission: { type, value: valuePaise },
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-body-sm text-error">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Priya Sharma"
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="priya@example.com"
          />
        </Field>
      </div>

      <div>
        <p className="section-label mb-2">Social links (optional)</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/…"
            aria-label="Instagram URL"
          />
          <Input
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="https://youtube.com/@…"
            aria-label="YouTube URL"
          />
          <Input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/…"
            aria-label="LinkedIn URL"
          />
          <Input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="https://x.com/…"
            aria-label="Twitter / X URL"
          />
        </div>
        <p className="mt-1.5 text-body-xs text-neutral-500">
          Enter full URLs including https://
        </p>
      </div>

      <CommissionSetter
        type={type}
        onType={setType}
        value={value}
        onValue={setValue}
        previewPaise={previewPaise}
      />

      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
        <Button variant="tertiary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!canSubmit} loading={submitting}>
          Onboard creator
        </Button>
      </div>
    </div>
  );
}

/** Segmented Percentage|Fixed selector + one number field + live preview.
 *  Shared shape between onboarding and the detail-page commission change. */
export function CommissionSetter({
  type,
  onType,
  value,
  onValue,
  previewPaise,
}: {
  type: CommissionType;
  onType: (t: CommissionType) => void;
  value: string;
  onValue: (v: string) => void;
  previewPaise: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="section-label mb-2">Commission</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-brand-ink/15 bg-neutral-50 p-0.5">
            {(["percentage", "fixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onType(t)}
                className={clsx(
                  "px-3.5 py-1.5 text-body-sm font-medium rounded-md transition",
                  type === t
                    ? "bg-neutral-0 shadow-elev-2 text-brand-ink"
                    : "text-brand-muted hover:text-brand-ink",
                )}
              >
                {t === "percentage" ? "Percentage" : "Fixed"}
              </button>
            ))}
          </div>
          <div className="w-40">
            {type === "percentage" ? (
              <Input
                type="number"
                min={0}
                max={MAX_COMMISSION_PERCENT}
                step={1}
                value={value}
                onChange={(e) => onValue(e.target.value)}
                trailingNode={<span className="text-body-sm">%</span>}
                aria-label="Commission percentage"
              />
            ) : (
              <Input
                type="number"
                min={1}
                max={BOOTCAMP_BASE_PAISE / 100}
                step={1}
                value={value}
                onChange={(e) => onValue(e.target.value)}
                leadingIcon={<span className="text-body-sm">₹</span>}
                aria-label="Fixed commission in rupees"
              />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-500/20 bg-brand-50 px-4 py-3">
        <p className="text-body-sm text-brand-ink">
          On a{" "}
          <strong className="font-semibold">
            {formatINR(BOOTCAMP_BASE_PAISE)}
          </strong>{" "}
          sale, this creator earns{" "}
          <strong className="font-semibold text-brand-primary tnum">
            {formatINR(previewPaise)}
          </strong>
          .
        </p>
      </div>
    </div>
  );
}

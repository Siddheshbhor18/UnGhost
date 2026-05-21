"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * EnrollForm — client component.
 *
 *   1. Displays the merchant QR code (static image at /merchant-qr.png).
 *   2. Shows pricing breakdown (base + GST + total) computed server-side.
 *   3. Collects UTR (12 chars), UPI app used, payer's mobile number.
 *   4. POSTs to /api/enrollments with an Idempotency-Key generated once
 *      per mount — survives network retries without creating duplicates.
 *   5. On success → redirects to /dashboard?just_enrolled=1 (the dashboard
 *      will show a "Submission received" toast based on that query param).
 *
 * UI conventions:
 *   • Inputs use `text-brand-ink` + `focus:ring-brand-primary` per design system.
 *   • Errors render below the submit button (single source of truth).
 *   • Submit button shows spinner + disables during in-flight.
 *   • Mobile + UTR fields use `pattern` for browser-level validation as a
 *     first line of defence — server still re-validates with Zod.
 */
interface EnrollFormProps {
  bootcampId: string;
  bootcampTitle: string;
  baseAmountLabel: string;
  gstAmountLabel: string;
  totalAmountLabel: string;
  gstPercent: number;
}

export function EnrollForm({
  bootcampId,
  bootcampTitle,
  baseAmountLabel,
  gstAmountLabel,
  totalAmountLabel,
  gstPercent,
}: EnrollFormProps) {
  const router = useRouter();
  const [utr, setUtr] = useState("");
  const [upiApp, setUpiApp] = useState<
    "phonepe" | "gpay" | "paytm" | "bhim" | "other"
  >("phonepe");
  const [mobile, setMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Generate the idempotency key once per page mount — survives accidental
  // double-clicks AND mid-submit network drops. crypto.randomUUID() is
  // available in all modern browsers.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const canSubmit =
    /^[A-Z0-9]{12}$/.test(utr.trim().toUpperCase()) &&
    /^[6-9]\d{9}$/.test(mobile.trim()) &&
    !submitting;

  async function submit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          bootcampId,
          utr: utr.trim().toUpperCase(),
          upiApp,
          payerMobile: mobile.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Submission failed");
      }
      router.push("/dashboard?just_enrolled=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* QR + pricing card */}
      <section className="rounded-3xl bg-white border border-brand-ink/10 shadow-glass-sm overflow-hidden">
        <div className="bg-gradient-to-br from-brand-primary/[0.04] to-brand-primary/[0.08] p-6 border-b border-brand-ink/10">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted">
            Step 1 — Pay via UPI
          </p>
          <p className="text-sm text-brand-ink mt-1">
            Scan with any UPI app. Total includes {gstPercent}% GST.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 p-6">
          {/* QR — replace /public/merchant-qr.svg with your real PhonePe merchant QR before launch. */}
          <div className="flex flex-col items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/merchant-qr.svg"
              alt={`Pay ${totalAmountLabel} via UPI`}
              width={220}
              height={220}
              className="rounded-2xl border border-brand-ink/10"
            />
            <p className="text-[11px] text-brand-muted mt-3 font-mono">
              unghost@hdfcbank
            </p>
          </div>

          {/* Pricing breakdown */}
          <div className="flex flex-col justify-center space-y-2">
            <Row label="Bootcamp fee" value={baseAmountLabel} />
            <Row label={`GST (${gstPercent}%)`} value={gstAmountLabel} />
            <div className="border-t border-brand-ink/10 pt-2 mt-2">
              <Row label="Total to pay" value={totalAmountLabel} bold />
            </div>
            <p className="text-[11px] text-brand-muted mt-3 flex items-start gap-1.5">
              <ShieldCheck size={12} className="mt-0.5 shrink-0" />
              Pay the exact amount. Mismatched amounts cause verification
              delays.
            </p>
          </div>
        </div>
      </section>

      {/* Form card */}
      <section className="rounded-3xl bg-white border border-brand-ink/10 shadow-glass-sm overflow-hidden">
        <div className="bg-gradient-to-br from-brand-primary/[0.04] to-brand-primary/[0.08] p-6 border-b border-brand-ink/10">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted">
            Step 2 — Confirm your payment
          </p>
          <p className="text-sm text-brand-ink mt-1">
            Find the UPI Transaction ID (UTR) in your app's transaction history.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <Field label="UPI Transaction ID (UTR)" hint="12 alphanumeric characters">
            <input
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value.toUpperCase())}
              placeholder="e.g. 432119876543"
              pattern="[A-Z0-9]{12}"
              maxLength={12}
              required
              className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-mono text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            />
          </Field>

          <Field label="UPI app used">
            <select
              value={upiApp}
              onChange={(e) =>
                setUpiApp(e.target.value as typeof upiApp)
              }
              className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            >
              <option value="phonepe">PhonePe</option>
              <option value="gpay">Google Pay</option>
              <option value="paytm">Paytm</option>
              <option value="bhim">BHIM</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Mobile number used for payment" hint="10 digits, starts with 6-9">
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 9876543210"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              required
              className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm tnum text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
            />
          </Field>

          {error ? (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              {error}
            </div>
          ) : null}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary text-white px-5 py-3 text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                Submit payment details
              </>
            )}
          </button>

          <p className="text-[11px] text-brand-muted text-center">
            By submitting, you confirm you've paid {totalAmountLabel} to{" "}
            <span className="font-mono">unghost@hdfcbank</span> for{" "}
            <span className="font-semibold">{bootcampTitle}</span>.
          </p>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          bold
            ? "text-sm font-semibold text-brand-ink"
            : "text-sm text-brand-muted"
        }
      >
        {label}
      </span>
      <span
        className={
          bold
            ? "text-lg font-display font-extrabold text-brand-ink tnum"
            : "text-sm text-brand-ink tnum"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-brand-ink mb-1.5 inline-flex items-center gap-2">
        {label}
        {hint ? (
          <span className="text-[11px] font-normal text-brand-muted">
            · {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}


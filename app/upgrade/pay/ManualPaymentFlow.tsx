"use client";

/**
 * ManualPaymentFlow — 3-step QR payment screen.
 *
 * Step 1: "Pay" — shows QR code + UPI ID, amount, name/phone fields
 * Step 2: "Confirm" — enter transaction ID + UPI app selector
 * Step 3: "Done" — success message, account activation notice
 *
 * Stopgap until PhonePe KYC clears. Entire admin approval pipeline
 * already exists in /admin/payment-approvals.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  Phone,
  QrCode,
  Smartphone,
  User,
} from "lucide-react";
import Link from "next/link";

type Step = "pay" | "confirm" | "done";

interface Props {
  plan: "pro" | "premium";
  planLabel: string;
  amountINR: number;
  cadence: string;
  userName: string;
  userEmail: string;
  userPhone: string;
}

// UPI ID for receiving payments — update this to your actual UPI ID
const UPI_ID = "siddheshbhor2004@okicici";
const UPI_NAME = "unGhost";

const UPI_APPS = [
  { value: "gpay", label: "Google Pay" },
  { value: "phonepe", label: "PhonePe" },
  { value: "paytm", label: "Paytm" },
  { value: "bhim", label: "BHIM" },
  { value: "other", label: "Other" },
] as const;

export function ManualPaymentFlow({
  plan,
  planLabel,
  amountINR,
  cadence,
  userName,
  userEmail,
  userPhone,
}: Props) {
  const [step, setStep] = useState<Step>("pay");
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [transactionId, setTransactionId] = useState("");
  const [upiApp, setUpiApp] = useState<string>("gpay");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canProceedToPay = name.trim().length >= 2 && /^\d{10}$/.test(phone);
  const canSubmit = transactionId.trim().length >= 4 && upiApp;

  // Generate QR code URL using a UPI deep link
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amountINR}&cu=INR&tn=${encodeURIComponent(`unGhost ${planLabel} plan`)}`;
  // Use a QR code API to render the UPI link
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiLink)}`;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/manual-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan,
          transactionId: transactionId.trim(),
          upiApp,
          payerName: name.trim(),
          payerMobile: phone.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reason?: string;
      };
      if (!res.ok) {
        throw new Error(data.reason ?? data.error ?? "Submission failed");
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-950 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">
              {cadence === "monthly" ? "Monthly plan" : "Lifetime plan"}
            </p>
            <h1 className="font-display font-extrabold text-2xl mt-0.5">
              unGhost {planLabel}
            </h1>
          </div>
          <div className="text-right">
            <p className="font-display font-extrabold text-3xl">
              ₹{amountINR.toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-neutral-400">
              {cadence === "monthly" ? "/month" : "one-time"}
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-neutral-100">
        {(["pay", "confirm", "done"] as const).map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-2.5 text-center text-[10px] uppercase tracking-wider font-semibold transition ${
              step === s
                ? "text-neutral-900 border-b-2 border-neutral-900"
                : s === "done" && step !== "done"
                  ? "text-neutral-300"
                  : "text-neutral-400"
            }`}
          >
            {i + 1}. {s === "pay" ? "Pay" : s === "confirm" ? "Confirm" : "Done"}
          </div>
        ))}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {step === "pay" && (
            <motion.div
              key="pay"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Name + Phone */}
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-[12px] font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                    <User size={12} /> Full name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-neutral-400 transition"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                    <Phone size={12} /> Mobile number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-neutral-400 transition"
                  />
                  {phone.length > 0 && phone.length < 10 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      {10 - phone.length} more digits needed
                    </p>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="text-center mb-5">
                <p className="text-[12px] font-semibold text-neutral-700 mb-3 flex items-center justify-center gap-1.5">
                  <QrCode size={13} /> Scan to pay ₹{amountINR.toLocaleString("en-IN")}
                </p>
                <div className="inline-block rounded-2xl border-2 border-neutral-200 p-3 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrUrl}
                    alt="UPI QR Code"
                    width={240}
                    height={240}
                    className="rounded-lg"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-3">
                  Or pay manually to UPI ID:
                </p>
                <p className="font-mono text-sm font-semibold text-neutral-900 mt-1 select-all">
                  {UPI_ID}
                </p>
              </div>

              {/* Important note */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-5">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Important:</strong> Pay exactly ₹
                  {amountINR.toLocaleString("en-IN")} using any UPI app. After
                  payment, click "I have paid" below and enter your Transaction
                  ID for verification.
                </p>
              </div>

              <button
                onClick={() => setStep("confirm")}
                disabled={!canProceedToPay}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white px-4 py-3 text-sm font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                I have paid <ArrowRight size={14} />
              </button>

              <Link
                href="/upgrade"
                className="block text-center text-[12px] text-neutral-500 hover:text-neutral-700 mt-4"
              >
                <ArrowLeft size={11} className="inline mr-1" />
                Back to plans
              </Link>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-5">
                <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 grid place-items-center mb-3">
                  <CreditCard size={20} className="text-neutral-600" />
                </div>
                <h2 className="font-display font-bold text-lg text-neutral-900">
                  Confirm your payment
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Enter the Transaction ID from your UPI app
                </p>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[12px] font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                    <Smartphone size={12} /> Transaction ID
                  </label>
                  <input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 412345678901"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-neutral-400 transition"
                    autoFocus
                  />
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    Find this in your UPI app → Transaction history → tap the
                    payment → Transaction ID / Reference number
                  </p>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-neutral-700 mb-1.5 block">
                    Paid via
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {UPI_APPS.map((app) => (
                      <button
                        key={app.value}
                        type="button"
                        onClick={() => setUpiApp(app.value)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition ${
                          upiApp === app.value
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3 mb-5 text-[12px] text-neutral-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Name</span>
                  <span className="font-semibold text-neutral-900">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mobile</span>
                  <span className="font-mono text-neutral-900">{phone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="text-neutral-900">{userEmail}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-1.5 mt-1.5">
                  <span className="font-semibold">Amount</span>
                  <span className="font-display font-bold text-neutral-900">
                    ₹{amountINR.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm text-rose-700 flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white px-4 py-3 text-sm font-semibold hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>Submit for verification</>
                )}
              </button>

              <button
                onClick={() => {
                  setStep("pay");
                  setError(null);
                }}
                className="block w-full text-center text-[12px] text-neutral-500 hover:text-neutral-700 mt-3"
              >
                <ArrowLeft size={11} className="inline mr-1" />
                Go back
              </button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.15, 1], rotate: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500 text-white grid place-items-center mb-4"
                style={{ boxShadow: "0 12px 28px rgba(14,159,110,0.4)" }}
              >
                <CheckCircle2 size={28} />
              </motion.div>

              <h2 className="font-display font-extrabold text-2xl text-neutral-900">
                Payment submitted!
              </h2>
              <p className="text-sm text-neutral-500 mt-3 leading-relaxed max-w-sm mx-auto">
                We're verifying your payment. Your{" "}
                <strong className="text-neutral-900">{planLabel}</strong> plan
                will be activated shortly.
              </p>

              <div className="mt-5 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-[12px] text-blue-800">
                  <Clock size={13} className="shrink-0" />
                  <span>Usually activated within 2 hours</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 px-4 py-2.5 text-[12px] text-neutral-600">
                  <Mail size={13} className="shrink-0" />
                  <span>
                    Confirmation email sent to{" "}
                    <strong className="text-neutral-900">{userEmail}</strong>
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 text-white px-6 py-3 text-sm font-semibold hover:bg-neutral-800 transition"
              >
                Go to dashboard <ArrowRight size={14} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

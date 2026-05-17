"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassNavbar,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";

type Category =
  | "account"
  | "payment"
  | "application"
  | "bootcamp"
  | "recruiter_dispute"
  | "bug_report"
  | "press"
  | "other";

const CATEGORIES: Array<{ value: Category; label: string; sla: string }> = [
  { value: "payment", label: "Payment / refund", sla: "4h" },
  { value: "account", label: "Account access", sla: "12h" },
  { value: "application", label: "Application dispute", sla: "24h" },
  { value: "bootcamp", label: "Bootcamp / live session", sla: "24h" },
  { value: "recruiter_dispute", label: "Recruiter dispute", sla: "24h" },
  { value: "bug_report", label: "Bug report", sla: "24h" },
  { value: "press", label: "Press inquiry", sla: "48h" },
  { value: "other", label: "Other", sla: "48h" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<Category>("account");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ticketId: string;
    slaHours: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedSla = CATEGORIES.find((c) => c.value === category)?.sla ?? "—";

  async function submit() {
    if (busy) return;
    if (!name.trim() || !email.trim() || message.length < 20) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, category, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send");
        return;
      }
      setResult({ ticketId: data.ticketId, slaHours: data.slaHours });
    } catch {
      setError("Network error. Try email instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5"
        >
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="mb-6">
          <GlassBadge tone="brand">
            <MessageCircle size={11} /> Support
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Get in touch
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            We respond to every ticket within the SLA shown next to each
            category. AI Coach handles &gt;80% of questions instantly inside
            the app.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Form */}
          <div className="lg:col-span-8">
            {result ? (
              <GlassCard
                variant="strong"
                className="!p-7 text-center bg-emerald-500/5 border-emerald-500/20"
              >
                <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-4">
                  <CheckCircle2 size={28} />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold">
                  Ticket created
                </p>
                <h2 className="font-display font-bold text-2xl text-brand-ink mt-2">
                  We&apos;ve got it.
                </h2>
                <p className="text-sm text-brand-ink/85 mt-3">
                  Ticket ID:{" "}
                  <span className="font-mono font-bold text-brand-ink">
                    {result.ticketId}
                  </span>
                </p>
                <p className="text-sm text-brand-muted mt-1">
                  Response SLA:{" "}
                  <span className="text-brand-ink font-semibold">
                    {result.slaHours}h
                  </span>{" "}
                  · confirmation email on its way to{" "}
                  <span className="font-mono">{email}</span>
                </p>
                <button
                  onClick={() => {
                    setResult(null);
                    setMessage("");
                  }}
                  className="text-xs font-semibold text-brand-primary hover:underline mt-5"
                >
                  Submit another →
                </button>
              </GlassCard>
            ) : (
              <GlassCard className="space-y-4">
                <Field label="Name">
                  <GlassInput
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aniket Sharma"
                  />
                </Field>
                <Field label="Email">
                  <GlassInput
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label={`Category · response SLA ${selectedSla}`}>
                  <GlassSelect
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as Category)
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label} — {c.sla}
                      </option>
                    ))}
                  </GlassSelect>
                </Field>
                <Field
                  label={`What's up? · ${message.length} / 20 min chars`}
                >
                  <GlassTextarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={7}
                    placeholder="Be specific. Include your account email + the URL or screenshot if it's a bug."
                    maxLength={5000}
                  />
                </Field>

                {error && (
                  <p className="text-sm text-rose-700 bg-rose-500/10 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                  <p className="text-[11px] text-brand-muted">
                    For payment-blocking issues, email{" "}
                    <a
                      href="mailto:billing@unghost.com"
                      className="text-brand-primary underline"
                    >
                      billing@unghost.com
                    </a>{" "}
                    directly.
                  </p>
                  <GlassButton
                    variant="brand"
                    size="md"
                    onClick={submit}
                    disabled={
                      busy ||
                      !name.trim() ||
                      !email.trim() ||
                      message.length < 20
                    }
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send size={14} /> Send ticket
                      </>
                    )}
                  </GlassButton>
                </div>
              </GlassCard>
            )}
          </div>

          {/* Aside */}
          <aside className="lg:col-span-4 space-y-4">
            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                <Mail size={11} /> Direct email
              </p>
              <ul className="space-y-2 text-sm">
                <DirectEmail
                  label="Billing"
                  email="billing@unghost.com"
                  sla="4h"
                />
                <DirectEmail
                  label="Support"
                  email="support@unghost.com"
                  sla="12h"
                />
                <DirectEmail label="Press" email="press@unghost.com" />
                <DirectEmail label="Legal" email="legal@unghost.com" />
                <DirectEmail label="DPO (DPDP)" email="dpo@unghost.com" />
                <DirectEmail label="Careers" email="careers@unghost.com" />
              </ul>
            </GlassCard>

            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                <MapPin size={11} /> Office
              </p>
              <p className="text-sm text-brand-ink/85 leading-relaxed">
                unGhost Technologies Pvt Ltd
                <br />
                BKC · Bandra (E)
                <br />
                Mumbai 400 051 · India
              </p>
            </GlassCard>

            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                <Clock size={11} /> Status
              </p>
              <p className="text-sm text-brand-ink/85">
                Real-time uptime:{" "}
                <a
                  href="https://status.unghost.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary underline font-semibold"
                >
                  status.unghost.com
                </a>
              </p>
            </GlassCard>
          </aside>
        </div>
      </div>
    </main>
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
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function DirectEmail({
  label,
  email,
  sla,
}: {
  label: string;
  email: string;
  sla?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <a
        href={`mailto:${email}`}
        className="text-brand-ink/85 hover:text-brand-primary transition"
      >
        <span className="text-[10px] uppercase tracking-wider text-brand-muted block">
          {label}
        </span>
        <span className="font-semibold text-xs">{email}</span>
      </a>
      {sla && (
        <GlassBadge tone="success">
          <Clock size={9} /> {sla}
        </GlassBadge>
      )}
    </li>
  );
}

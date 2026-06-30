"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** The two server-priced order kinds. */
export type CheckoutBody =
  | { kind: "jobs"; plan: "jobs_quarterly" | "jobs_annual" }
  | { kind: "courses"; courses: string[] };

type Status =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "verifying" }
  | { state: "error"; message: string };

interface Props {
  /** Server-priced order payload (POSTed verbatim to the order route). */
  body: CheckoutBody;
  /** Razorpay modal description line. */
  description: string;
  /** Where to send the buyer once the payment is verified. */
  successUrl: string;
  prefill?: { name?: string; email?: string; contact?: string };
  className?: string;
  label: string;
  disabled?: boolean;
}

/**
 * Generic Razorpay checkout button for jobs plans + course carts. Same trusted
 * flow as the premium button: POST order (price set server-side) → open modal →
 * POST verify → redirect. The webhook is the real source of truth; this just
 * makes the happy path instant.
 */
export function CheckoutButton({
  body,
  description,
  successUrl,
  prefill,
  className,
  label,
  disabled,
}: Props) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.Razorpay !== "undefined",
  );
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const pay = useCallback(async () => {
    setStatus({ state: "starting" });
    if (typeof window.Razorpay === "undefined") {
      setStatus({ state: "error", message: "Checkout is still loading — try again in a moment." });
      return;
    }
    try {
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const order = (await orderRes.json()) as {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        error?: string;
      };
      if (!orderRes.ok || !order.orderId || !order.keyId) {
        setStatus({
          state: "error",
          message:
            order.error === "empty_cart"
              ? "Your cart is empty."
              : "Couldn't start checkout. Please try again.",
        });
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount ?? 0,
        currency: order.currency ?? "INR",
        name: "unGhost",
        description,
        order_id: order.orderId,
        prefill,
        theme: { color: "#0191FC" },
        modal: {
          ondismiss: () =>
            setStatus({ state: "error", message: "Payment cancelled." }),
        },
        handler: async (response) => {
          setStatus({ state: "verifying" });
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verify = (await verifyRes.json()) as { verified?: boolean };
            if (verifyRes.ok && verify.verified) {
              router.push(successUrl);
              router.refresh();
            } else {
              setStatus({
                state: "error",
                message:
                  "Payment received — finalising your access. If it isn't active in a minute, refresh or contact support.",
              });
            }
          } catch {
            setStatus({
              state: "error",
              message:
                "Payment received — finalising your access. If it isn't active shortly, refresh the page.",
            });
          }
        },
      });
      rzp.on("payment.failed", (resp) => {
        setStatus({
          state: "error",
          message: resp.error?.description ?? "Payment failed. Please try again.",
        });
      });
      rzp.open();
    } catch {
      setStatus({
        state: "error",
        message: "Something went wrong starting checkout. Please try again.",
      });
    }
  }, [body, description, successUrl, prefill, router]);

  const busy = status.state === "starting" || status.state === "verifying";

  return (
    <div className="w-full">
      <Script
        src={CHECKOUT_SRC}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <button
        type="button"
        disabled={disabled || busy || !scriptReady}
        onClick={pay}
        className={clsx(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60",
          className,
        )}
      >
        {busy && <Loader2 size={16} className="animate-spin" />}
        {status.state === "verifying" ? "Confirming…" : busy ? "Starting…" : label}
      </button>
      {status.state === "error" && (
        <p className="mt-2 text-center text-body-xs text-error">{status.message}</p>
      )}
    </div>
  );
}

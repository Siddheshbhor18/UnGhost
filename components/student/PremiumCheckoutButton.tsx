"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Loader2 } from "lucide-react";
import clsx from "clsx";

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type Status =
  | { state: "idle" }
  | { state: "starting" }
  | { state: "verifying" }
  | { state: "error"; message: string };

interface Props {
  /** Optional discount code (validated + priced server-side). */
  coupon?: string;
  /** Pre-fills the Razorpay modal. */
  prefill?: { name?: string; email?: string; contact?: string };
  className?: string;
  label?: string;
}

/**
 * Premium (annual) checkout button — the automated replacement for the manual
 * QR + admin-approval flow.
 *
 *   1. POST /api/payments/razorpay/order { plan: "premium" } (price set server-side)
 *   2. Open the Razorpay modal with the returned order id
 *   3. On success → POST /api/payments/razorpay/verify (signature + amount
 *      checked server-side) → redirect to /upgrade/success
 *
 * The webhook is the real source of truth; this just makes the happy path
 * feel instant. Handles modal-dismiss and payment.failed with readable copy.
 * KEY_SECRET never touches the client — only the public key id (from the
 * order response).
 */
export function PremiumCheckoutButton({
  coupon,
  prefill,
  className,
  label = "Go Premium",
}: Props) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(() => {
    return typeof window !== "undefined" && typeof window.Razorpay !== "undefined";
  });
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const pay = useCallback(async () => {
    setStatus({ state: "starting" });

    if (typeof window.Razorpay === "undefined") {
      setStatus({
        state: "error",
        message: "Checkout is still loading — try again in a moment.",
      });
      return;
    }

    try {
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "premium", coupon }),
      });
      const order = (await orderRes.json()) as {
        orderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        error?: string;
      };

      if (!orderRes.ok || !order.orderId || !order.keyId) {
        setStatus({ state: "error", message: orderErrorMessage(order.error, orderRes.status) });
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount ?? 0,
        currency: order.currency ?? "INR",
        name: "unGhost",
        description: "Premium · 1 year",
        order_id: order.orderId,
        prefill,
        theme: { color: "#6d28d9" },
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
              router.push("/upgrade/success?plan=premium");
              router.refresh();
            } else {
              // Payment went through but our instant check didn't confirm.
              // The webhook will still grant it — reassure, don't alarm.
              setStatus({
                state: "error",
                message:
                  "Payment received — finalising your access. If Premium isn't active in a minute, refresh or contact support.",
              });
            }
          } catch {
            setStatus({
              state: "error",
              message:
                "Payment received — finalising your access. If Premium isn't active shortly, refresh the page.",
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
  }, [coupon, prefill, scriptReady, router]);

  const busy = status.state === "starting" || status.state === "verifying";

  return (
    <div className="w-full">
      <Script
        src={CHECKOUT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={clsx(
          "w-full rounded-xl bg-violet-600 text-white text-body-sm font-medium py-3 hover:bg-violet-700 disabled:opacity-50",
          className,
        )}
      >
        {busy ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            {status.state === "verifying" ? "Confirming…" : "Opening…"}
          </span>
        ) : (
          label
        )}
      </button>
      {status.state === "error" ? (
        <p className="mt-2 text-center text-body-xs text-red-600" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

function orderErrorMessage(error: string | undefined, httpStatus: number): string {
  switch (error) {
    case "unauthorized":
      return "Please sign in to upgrade.";
    case "students_only":
      return "Only student accounts can upgrade.";
    case "already_premium":
      return "You're already on Premium.";
    case "account_inactive":
      return "Your account isn't active. Contact support.";
    case "razorpay_auth_failed":
    case "order_create_failed":
      return "Couldn't start checkout. Please try again in a moment.";
    default:
      return `Couldn't start checkout (${error ?? httpStatus}).`;
  }
}

// Minimal typings for the Razorpay Standard Checkout script (checkout.js),
// which attaches a global `Razorpay` constructor to `window`.
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: { order_id?: string; payment_id?: string };
  };
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler?: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: string;
    vpa?: string;
  };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
  /** Restrict/reorder the payment methods shown in the modal. */
  config?: {
    display?: {
      blocks?: Record<
        string,
        {
          name?: string;
          instruments?: Array<{ method: string; flows?: string[] }>;
        }
      >;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailureResponse) => void,
  ) => void;
}

interface Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}

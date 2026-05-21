import { Suspense } from "react";
import { SignupWizard } from "@/components/auth/SignupWizard";

/**
 * /signup
 *
 * Thin wrapper around the SignupWizard. The wizard owns all state, layout,
 * and submission — this page exists only to satisfy Next.js's app-router
 * convention and to gate the wizard inside a Suspense boundary.
 */
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupWizard />
    </Suspense>
  );
}

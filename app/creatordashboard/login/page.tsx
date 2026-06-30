"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { Card, Button, Field, Input, SectionLabel } from "@/components/ui";

/**
 * Hidden creator sign-in. Not linked from the main platform UI (ground rule
 * §0.15) — creators reach it directly. Submits credentials WITHOUT a role tab,
 * so `authorize()` skips role-tab enforcement and authenticates the creator by
 * their account role. On success the dashboard layout takes over.
 */
export default function CreatorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError("Those credentials didn't work. Check your email and password.");
        return;
      }
      router.push("/creatordashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card padded className="w-full max-w-sm">
        <SectionLabel icon={<Sparkles size={13} />} tone="brand">
          Creator
        </SectionLabel>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-neutral-900">
          Creator sign in
        </h1>
        <p className="mt-1 text-body-sm text-neutral-500">
          Sign in to your unGhost creator dashboard.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password" errorMessage={error ?? undefined}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" fullWidth loading={submitting} disabled={!email || !password}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}

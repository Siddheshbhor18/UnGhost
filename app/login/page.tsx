"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, DoorOpen, Mail } from "lucide-react";
import Link from "next/link";
import { PixelButton } from "@/components/arcade/PixelButton";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("alice@demo.test");
  const [password, setPassword] = useState("demo");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setErr("Wrong credentials. Try alice@demo.test / demo");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="font-pixel text-xs text-neon-pink neon-text">← NO/GHOST</Link>
        </div>

        <ArcadeCard glow="pink" className="relative overflow-hidden">
          {/* door swing animation */}
          <motion.div
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-x-0 top-0 flex justify-center pt-3 pointer-events-none"
            style={{ transformOrigin: "left center" }}
          >
            <DoorOpen className="text-neon-pink/30" size={120} strokeWidth={1} />
          </motion.div>

          <div className="relative pt-24">
            <Badge tone="pink" className="mb-2">▸ THE DOORWAY</Badge>
            <h1 className="font-pixel text-xl text-neon-pink neon-text mb-1">
              Unlock Your Terminal
            </h1>
            <p className="font-mono text-xs text-ink-muted mb-6">
              Demo: <span className="text-neon-blue">alice@demo.test</span> · <span className="text-neon-blue">devraj@demo.test</span> · <span className="text-neon-blue">root@noghost.test</span> &nbsp;·&nbsp; pass: <span className="text-neon-green">demo</span>
            </p>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="font-pixel text-[10px] text-ink-muted">EMAIL</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pixel-input w-full mt-1"
                  placeholder="you@yourdomain.com"
                />
              </div>
              <div>
                <label className="font-pixel text-[10px] text-ink-muted">PASSWORD</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pixel-input w-full mt-1"
                  placeholder="demo"
                />
              </div>
              {err && (
                <p className="font-mono text-xs text-neon-red border border-neon-red px-3 py-2">{err}</p>
              )}
              <PixelButton type="submit" variant="pink" size="lg" block disabled={busy}>
                {busy ? "OPENING…" : <>Unlock Career <ArrowRight size={14} /></>}
              </PixelButton>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-[2px] bg-bg-ink flex-1" />
              <span className="font-mono text-[10px] text-ink-dim">OR</span>
              <div className="h-[2px] bg-bg-ink flex-1" />
            </div>

            <div className="space-y-2">
              <PixelButton
                variant="ghost"
                block
                size="md"
                onClick={() => signIn("google", { callbackUrl: next }).catch(() => setErr("Google OAuth not configured. Use credentials."))}
              >
                <Mail size={14} /> Continue with Google
              </PixelButton>
              <PixelButton
                variant="ghost"
                block
                size="md"
                onClick={() => signIn("linkedin", { callbackUrl: next }).catch(() => setErr("LinkedIn OAuth not configured."))}
              >
                Continue with LinkedIn
              </PixelButton>
            </div>

            <p className="mt-6 text-center font-mono text-[10px] text-ink-dim">
              Recruiter?{" "}
              <Link href="/recruiter/login" className="text-neon-blue underline">
                Go to corporate auth
              </Link>
            </p>
          </div>
        </ArcadeCard>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <LoginInner />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { ShieldCheck, KeyRound } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      // Generic message — never echo valid credentials back to the screen.
      setErr("Wrong email or password.");
      return;
    }
    // The admin area is gated server-side by role in app/admin/layout.tsx;
    // a non-admin who authenticates here is redirected away there.
    router.push("/admin/today");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6 font-pixel text-xs text-neon-yellow">
          ← NO/GHOST
        </Link>
        <ArcadeCard glow="yellow">
          <Badge tone="yellow" className="mb-2"><ShieldCheck size={10} /> ADMIN AUTH</Badge>
          <h1 className="font-pixel text-xl text-neon-yellow neon-text mb-1">Sensei Terminal</h1>
          <p className="font-mono text-xs text-ink-muted mb-6">
            Instructor + platform admin sign-in.
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="admin-email" className="font-pixel text-[10px] text-ink-muted">ADMIN ID</label>
              <input id="admin-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pixel-input w-full mt-1" />
            </div>
            <div>
              <label htmlFor="admin-password" className="font-pixel text-[10px] text-ink-muted">SECURE KEY</label>
              <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pixel-input w-full mt-1" />
            </div>
            {err && <p className="font-mono text-xs text-neon-red border border-neon-red px-3 py-2">{err}</p>}
            <PixelButton type="submit" variant="yellow" size="lg" block disabled={busy}>
              <KeyRound size={14} /> {busy ? "AUTHENTICATING…" : "Enter Admin Panel"}
            </PixelButton>
          </form>
        </ArcadeCard>
      </div>
    </main>
  );
}

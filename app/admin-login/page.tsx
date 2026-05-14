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
  const [email, setEmail] = useState("root@noghost.test");
  const [password, setPassword] = useState("demo");
  const [otp, setOtp] = useState("000000");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setErr("Wrong credentials. Demo: root@noghost.test / demo");
      return;
    }
    if (otp !== "000000") {
      setErr("Mock 2FA: enter 000000");
      return;
    }
    router.push("/admin/metrics");
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
            Instructor + platform admin. Mock 2FA: <span className="text-neon-green">000000</span>
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-pixel text-[10px] text-ink-muted">ADMIN ID</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pixel-input w-full mt-1" />
            </div>
            <div>
              <label className="font-pixel text-[10px] text-ink-muted">SECURE KEY</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pixel-input w-full mt-1" />
            </div>
            <div>
              <label className="font-pixel text-[10px] text-ink-muted">2FA · 6 DIGITS</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="pixel-input w-full mt-1 tracking-[0.4em] text-center" />
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

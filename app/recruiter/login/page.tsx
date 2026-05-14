"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { Building2, ArrowRight, ShieldAlert } from "lucide-react";

const PUBLIC_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com", "proton.me"];

export default function RecruiterLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("hr@stark.test");
  const [password, setPassword] = useState("demo");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || PUBLIC_DOMAINS.includes(domain)) {
      setErr("Corporate email only. Public domains are rejected.");
      return;
    }
    setBusy(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setErr("Wrong credentials. Try hr@stark.test / demo");
      return;
    }
    router.push("/recruiter/command");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="font-pixel text-xs text-neon-blue neon-text">← NO/GHOST</Link>
        </div>
        <ArcadeCard glow="blue">
          <Badge tone="blue" className="mb-2"><Building2 size={10} /> CORPORATE AUTH</Badge>
          <h1 className="font-pixel text-xl text-neon-blue neon-text mb-1">Recruiter Terminal</h1>
          <p className="font-mono text-xs text-ink-muted mb-6">
            Demo: <span className="text-neon-pink">hr@stark.test</span> · <span className="text-neon-pink">hr@quanta.test</span> · pass: <span className="text-neon-green">demo</span>
          </p>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="font-pixel text-[10px] text-ink-muted">CORPORATE EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pixel-input w-full mt-1"
                placeholder="you@yourcompany.com"
              />
            </div>
            <div>
              <label className="font-pixel text-[10px] text-ink-muted">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pixel-input w-full mt-1"
              />
            </div>
            {err && (
              <p className="font-mono text-xs text-neon-red border border-neon-red px-3 py-2 flex items-center gap-2">
                <ShieldAlert size={14} /> {err}
              </p>
            )}
            <PixelButton type="submit" variant="blue" size="lg" block disabled={busy}>
              {busy ? "AUTHENTICATING…" : <>Enter Command Center <ArrowRight size={14} /></>}
            </PixelButton>
          </form>
          <p className="mt-6 text-center font-mono text-[10px] text-ink-dim">
            Student?{" "}
            <Link href="/login" className="text-neon-pink underline">
              Go to the doorway
            </Link>
          </p>
        </ArcadeCard>
      </div>
    </main>
  );
}

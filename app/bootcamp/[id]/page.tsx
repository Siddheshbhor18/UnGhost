"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/shared/Navbar";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";
import { PhonePeDrawer } from "@/components/shared/PhonePeDrawer";
import type { Bootcamp } from "@/lib/data/types";
import { Calendar, Check, Lock, PlayCircle, Send, Star, Users } from "lucide-react";

export default function BootcampPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [bc, setBc] = useState<Bootcamp | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const [verifyText, setVerifyText] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ passed: boolean; message: string; skill?: string } | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bootcamps")
      .then((r) => r.json())
      .then((all: Bootcamp[]) => {
        const target = all.find((b) => b.id === params.id);
        setBc(target ?? null);
        if (target && session?.user?.id) {
          setEnrolled(target.enrolledStudentIds.includes(session.user.id));
        }
      });
  }, [params.id, session]);

  async function verify() {
    if (!bc) return;
    const r = await fetch("/api/bootcamps/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bootcampId: bc.id, response: verifyText }),
    });
    setVerifyResult(await r.json());
  }

  if (!bc)
    return (
      <main className="min-h-screen bg-bg-base">
        <Navbar />
        <p className="text-center py-20 font-mono text-ink-muted">Loading…</p>
      </main>
    );

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        <Link href="/bootcamps" className="font-mono text-xs text-neon-blue">← Bootcamp catalog</Link>

        <ArcadeCard glow="green">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Badge tone="green" className="mb-2">{bc.skill}</Badge>
              <h1 className="font-pixel text-2xl text-neon-green neon-text mb-2">{bc.title}</h1>
              <p className="font-mono text-sm text-ink-muted max-w-2xl">{bc.description}</p>
              <div className="flex gap-3 font-mono text-[11px] text-ink-muted mt-3">
                <span><Star className="inline mr-1 text-neon-yellow" size={11} />{bc.rating}</span>
                <span><Users className="inline mr-1" size={11} />{bc.enrolledStudentIds.length} enrolled</span>
                <span>{bc.durationWeeks} weeks</span>
              </div>
            </div>
            {enrolled ? (
              <Badge tone="green"><Check size={12} /> ENROLLED</Badge>
            ) : (
              <div className="text-right">
                <p className="font-pixel text-2xl text-neon-pink mb-2">₹{bc.priceINR.toLocaleString("en-IN")}</p>
                <PixelButton variant="green" size="lg" onClick={() => setDrawer(true)}>Enroll · PhonePe</PixelButton>
              </div>
            )}
          </div>
        </ArcadeCard>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* video player */}
          <div className="lg:col-span-2 space-y-3">
            <ArcadeCard>
              <div className="relative aspect-video bg-bg-base border-2 border-bg-ink overflow-hidden flex items-center justify-center">
                {enrolled ? (
                  <div className="text-center">
                    <PlayCircle className="mx-auto text-neon-green animate-pulse" size={72} />
                    <p className="font-pixel text-xs text-neon-green mt-3">{bc.videos[activeVideo].title}</p>
                    <p className="font-mono text-[10px] text-ink-muted mt-1">{bc.videos[activeVideo].durationMin} min · playback simulated</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Lock className="mx-auto text-neon-red" size={48} />
                    <p className="font-pixel text-xs text-neon-red mt-3">LOCKED</p>
                    <p className="font-mono text-[10px] text-ink-muted">Enroll to unlock</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {bc.videos.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => enrolled && setActiveVideo(i)}
                    className={`text-left border-2 px-3 py-2 font-pixel text-[10px] ${
                      i === activeVideo ? "border-neon-green text-neon-green" : "border-bg-ink text-ink-muted"
                    } ${!enrolled && "opacity-40 cursor-not-allowed"}`}
                    disabled={!enrolled}
                  >
                    MODULE 0{i + 1} · {v.title.slice(0, 28)}{v.title.length > 28 ? "…" : ""}
                  </button>
                ))}
                <div className="border-2 px-3 py-2 font-pixel text-[10px] border-neon-pink text-neon-pink">
                  MODULE 03 · LIVE ALIGNMENT
                </div>
              </div>
            </ArcadeCard>

            {/* Skill verify gate */}
            {enrolled && (
              <ArcadeCard glow="yellow">
                <p className="font-pixel text-[10px] text-neon-yellow mb-2">▸ SKILL VERIFY GATE</p>
                <p className="font-mono text-xs text-ink-muted mb-3">{bc.videos[activeVideo].verifyPrompt}</p>
                <textarea
                  className="pixel-input w-full min-h-[120px]"
                  value={verifyText}
                  onChange={(e) => setVerifyText(e.target.value)}
                  placeholder="Type your understanding. Concrete and specific beats long-winded."
                />
                <div className="mt-3 flex justify-between items-center">
                  <p className="font-mono text-[10px] text-ink-dim">{verifyText.length} chars</p>
                  <PixelButton variant="yellow" size="md" onClick={verify}>
                    <Send size={12} /> Verify Comprehension
                  </PixelButton>
                </div>
                {verifyResult && (
                  <div className={`mt-3 border-2 p-3 ${verifyResult.passed ? "border-neon-green text-neon-green" : "border-neon-red text-neon-red"}`}>
                    <p className="font-pixel text-[10px]">{verifyResult.passed ? "▸ VERIFIED" : "▸ NOT YET"}</p>
                    <p className="font-mono text-xs mt-1">{verifyResult.message}</p>
                  </div>
                )}
              </ArcadeCard>
            )}
          </div>

          {/* sidebar */}
          <aside className="space-y-3">
            <ArcadeCard glow="pink">
              <p className="font-pixel text-[10px] text-neon-pink mb-3 flex items-center gap-2">
                <Calendar size={12} /> LIVE ALIGNMENT
              </p>
              <p className="font-mono text-xs text-ink-muted mb-3">Pick a slot to RSVP. Live session caps at 25 students.</p>
              <div className="space-y-2">
                {bc.liveSlots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    disabled={!enrolled}
                    className={`w-full text-left border-2 px-3 py-2 font-mono text-xs transition-colors ${
                      slot === s ? "border-neon-pink text-neon-pink" : "border-bg-ink text-ink-muted hover:border-neon-pink hover:text-neon-pink"
                    } ${!enrolled && "opacity-40 cursor-not-allowed"}`}
                  >
                    {new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </button>
                ))}
              </div>
              {slot && (
                <PixelButton variant="pink" size="sm" block className="mt-3">
                  RSVP for Live Session
                </PixelButton>
              )}
            </ArcadeCard>

            <ArcadeCard>
              <p className="font-pixel text-[10px] text-neon-blue mb-2">▸ WHAT YOU UNLOCK</p>
              <ul className="font-mono text-xs text-ink-muted space-y-1.5">
                <li>· Verified <span className="text-neon-green">{bc.skill}</span> badge on profile</li>
                <li>· Recruiters can filter on verified-skill</li>
                <li>· Bridges 2-3 missions you couldn&apos;t apply to before</li>
                <li>· Lifetime access to recorded modules</li>
              </ul>
            </ArcadeCard>
          </aside>
        </div>
      </div>

      <PhonePeDrawer
        open={drawer}
        bootcampId={bc.id}
        bootcampTitle={bc.title}
        amount={bc.priceINR}
        onClose={() => setDrawer(false)}
        onSuccess={() => setEnrolled(true)}
      />
    </main>
  );
}

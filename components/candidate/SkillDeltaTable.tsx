"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";

interface Row {
  skill: string;
  has: boolean;
  bootcampId?: string;
}

export function SkillDeltaTable({ rows }: { rows: Row[] }) {
  return (
    <div className="pixel-card overflow-hidden">
      <div className="border-b-2 border-bg-ink px-4 py-2 bg-bg-base">
        <p className="font-pixel text-[10px] text-neon-blue">▸ SKILL DELTA</p>
      </div>
      <ul className="divide-y-2 divide-bg-ink">
        {rows.map((r) => (
          <li key={r.skill} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {r.has ? (
                <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-neon-green bg-neon-green/10 text-neon-green">
                  <Check size={14} />
                </span>
              ) : (
                <span className="inline-flex h-6 w-6 items-center justify-center border-2 border-neon-red bg-neon-red/10 text-neon-red">
                  <X size={14} />
                </span>
              )}
              <span className={`font-mono text-sm ${r.has ? "text-ink-primary" : "text-neon-red"}`}>
                {r.skill}
              </span>
            </div>
            {!r.has && r.bootcampId && (
              <Link href={`/bootcamp/${r.bootcampId}`}>
                <PixelButton variant="blue" size="sm">
                  Bridge with Bootcamp →
                </PixelButton>
              </Link>
            )}
            {r.has && <Badge tone="green">OK</Badge>}
          </li>
        ))}
      </ul>
    </div>
  );
}

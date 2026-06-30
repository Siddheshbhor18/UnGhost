"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Server-authoritative config the client UI needs but can't derive on its own
 * (e.g. the payout floor, which is env-overridable on the server). The layout
 * computes these and provides them once near the root.
 */
export interface CreatorConfig {
  /** Minimum withdrawable amount in paise — the server enforces the same value. */
  minPayoutPaise: number;
}

const Ctx = createContext<CreatorConfig | null>(null);

export function CreatorConfigProvider({
  value,
  children,
}: {
  value: CreatorConfig;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCreatorConfig(): CreatorConfig {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useCreatorConfig must be used inside <CreatorConfigProvider>");
  return v;
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";

const TabsCtx = createContext<{ value: string; set: (v: string) => void } | null>(null);

export function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsCtx.Provider value={{ value, set: setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "inline-flex p-1 rounded-2xl bg-brand-ink/5 border border-brand-ink/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  icon,
  children,
}: {
  value: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const ctx = useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.set(value)}
      className={clsx(
        "px-5 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition",
        active ? "bg-white shadow-sm text-brand-ink" : "text-brand-muted hover:text-brand-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className="animate-fade-up">{children}</div>;
}

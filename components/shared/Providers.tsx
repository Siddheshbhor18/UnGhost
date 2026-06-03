"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { ToastProvider } from "@/components/ui";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
      }),
  );
  return (
    <SessionProvider>
      <QueryClientProvider client={qc}>
        {/* reducedMotion="user" makes every framer-motion animation in the
            tree honour prefers-reduced-motion automatically — covers the
            components that don't call useReducedMotion individually. */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </QueryClientProvider>
    </SessionProvider>
  );
}

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LogIn, RefreshCw } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { ApiError, getJson } from "../_lib/api";

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Re-run the request (e.g. after a mutation or a retry tap). */
  reload: () => void;
}

/**
 * Fetch a creator API endpoint and track loading/error. The endpoint is scoped
 * server-side to the session user, so an unauthenticated/non-creator caller
 * gets a 403 — surfaced as `error.status === 403` for a friendly login prompt.
 */
export function useApi<T>(url: string): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    getJson<T>(url)
      .then((result) => {
        if (!alive) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setData(null);
        setError(e instanceof ApiError ? e : new ApiError(0, "network_error"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => reload(), [reload]);

  return { data, error, loading, reload };
}

/**
 * Renders the right thing for an async query: the skeleton while loading, a
 * login prompt on 403, a retryable error otherwise, and finally the data.
 * Used by every dashboard page (shared loading/auth/error contract).
 */
export function PageState<T>({
  query,
  skeleton,
  children,
}: {
  query: ApiState<T>;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (query.loading && !query.data) return <>{skeleton}</>;
  if (query.error?.status === 403) return <LoginNeeded />;
  if (query.error || !query.data)
    return <LoadError onRetry={query.reload} />;
  return <>{children(query.data)}</>;
}

function LoginNeeded() {
  return (
    <EmptyState
      title="Please log in"
      description="Sign in with your creator account to see your earnings, link, and payouts."
      illustration={<LogIn size={32} strokeWidth={1.6} />}
      action={
        <Link href="/login" className="btn btn-md btn-primary">
          Log in
        </Link>
      }
    />
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="Couldn't load this"
      description="Something went wrong fetching your data. Check your connection and try again."
      illustration={<RefreshCw size={30} strokeWidth={1.6} />}
      action={
        <Button variant="secondary" leadingIcon={<RefreshCw size={15} />} onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}

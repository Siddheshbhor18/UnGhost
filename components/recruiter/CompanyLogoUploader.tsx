"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Trash2, ImageIcon } from "lucide-react";
import { CompanyLogo } from "@/components/shared/CompanyLogo";

const MAX_MB = 2;
const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

const ERR: Record<string, string> = {
  unsupported_type: "Use a PNG, JPG, WEBP or SVG image.",
  file_too_large: `Logo must be under ${MAX_MB}MB.`,
  company_admin_only: "Only your company admin can change the logo.",
  no_company: "Your account isn't linked to a company yet.",
};

/**
 * Recruiter-facing company logo control. Uploads a square logo for the
 * recruiter's company (company-admin only, enforced server-side) and shows a
 * live preview. Falls back to the letter-initial when no logo is set.
 */
export function CompanyLogoUploader({
  companyName,
  logoUrl,
  canEdit,
}: {
  companyName: string;
  logoUrl?: string | null;
  /** Whether this recruiter is the company admin (server is the source of truth). */
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<string | null>(logoUrl ?? null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(ERR.file_too_large);
      return;
    }

    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERR[data?.error] ?? "Upload failed. Try again.");
        return;
      }
      setCurrent(data.logoUrl as string);
      router.refresh();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove() {
    setError(null);
    setBusy("remove");
    try {
      const res = await fetch("/api/company/logo", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERR[data?.error] ?? "Couldn't remove the logo.");
        return;
      }
      setCurrent(null);
      router.refresh();
    } catch {
      setError("Couldn't remove the logo. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-start gap-4">
      <CompanyLogo name={companyName} logoUrl={current} size={72} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-ink flex items-center gap-1.5">
          <ImageIcon size={14} /> Company logo
        </p>
        <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
          Shown on your missions and company page. Square PNG/SVG works best —
          max {MAX_MB}MB.
        </p>

        {canEdit ? (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onPick}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 transition disabled:opacity-50"
            >
              {busy === "upload" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              {current ? "Replace logo" : "Upload logo"}
            </button>
            {current && (
              <button
                type="button"
                onClick={onRemove}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border border-rose-500/30 text-rose-700 hover:bg-rose-500/10 transition disabled:opacity-50"
              >
                {busy === "remove" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Remove
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-brand-muted mt-2 italic">
            Only your company admin can change the logo.
          </p>
        )}

        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
